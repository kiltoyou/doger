import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../prisma/client";

interface AuthedSocket extends Socket {
  userId?: string;
}

export function setupSockets(httpServer: HTTPServer, clientOrigins: string[]) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: clientOrigins, credentials: true },
  });

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Требуется авторизация"));
    try {
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Недействительный токен"));
    }
  });

  io.on("connection", async (socket: AuthedSocket) => {
    const userId = socket.userId!;
    socket.join(`user:${userId}`);
    await prisma.user.update({ where: { id: userId }, data: { status: "online" } });
    socket.broadcast.emit("presence:update", { userId, status: "online" });

    // --- Chat rooms ---
    socket.on("chat:join", (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on("chat:leave", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on("chat:typing", ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit("chat:typing", { chatId, userId });
    });

    socket.on(
      "message:send",
      async (payload: {
        chatId: string;
        type?: string;
        content?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
        duration?: number;
      }) => {
        const message = await prisma.message.create({
          data: {
            chatId: payload.chatId,
            senderId: userId,
            type: payload.type ?? "text",
            content: payload.content,
            fileUrl: payload.fileUrl,
            fileName: payload.fileName,
            fileSize: payload.fileSize,
            duration: payload.duration,
          },
          include: { sender: true },
        });

        io.to(`chat:${payload.chatId}`).emit("message:new", {
          id: message.id,
          chatId: message.chatId,
          type: message.type,
          content: message.content,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          duration: message.duration,
          createdAt: message.createdAt,
          sender: {
            id: message.sender.id,
            displayName: message.sender.displayName,
            avatarColor: message.sender.avatarColor,
          },
        });

        // Уведомления остальным участникам чата (кроме отправителя)
        const otherMembers = await prisma.chatMember.findMany({
          where: { chatId: payload.chatId, userId: { not: userId } },
        });

        const preview =
          message.type === "voice"
            ? "🎤 Голосовое сообщение"
            : message.type === "file"
            ? `📎 ${message.fileName}`
            : (message.content || "").slice(0, 80);

        for (const member of otherMembers) {
          const notification = await prisma.notification.create({
            data: {
              userId: member.userId,
              type: "message",
              title: message.sender.displayName,
              subtitle: preview,
            },
          });
          io.to(`user:${member.userId}`).emit("notification:new", notification);
        }
      }
    );

    // --- Live Room presence & controls ---
    socket.on("live:join", (chatId: string) => {
      socket.join(`live:${chatId}`);
      socket.to(`live:${chatId}`).emit("live:participant-joined", { userId });
    });

    socket.on("live:leave", (chatId: string) => {
      socket.leave(`live:${chatId}`);
      socket.to(`live:${chatId}`).emit("live:participant-left", { userId });
    });

    socket.on(
      "live:toggle",
      ({ chatId, field, value }: { chatId: string; field: "cameraOn" | "micOn" | "screenOn"; value: boolean }) => {
        socket.to(`live:${chatId}`).emit("live:toggle", { userId, field, value });
      }
    );

    socket.on("disconnect", async () => {
      await prisma.user.update({ where: { id: userId }, data: { status: "offline" } });
      socket.broadcast.emit("presence:update", { userId, status: "offline" });
    });
  });

  return io;
}
