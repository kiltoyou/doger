import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../prisma/client";

interface AuthedSocket extends Socket {
  userId?: string;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

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
    socket.on("chat:join", async (chatId: string) => {
      socket.join(`chat:${chatId}`);

      // Отмечаем все непрочитанные чужие сообщения в этом чате как прочитанные
      const unread = await prisma.message.findMany({
        where: { chatId, senderId: { not: userId }, readAt: null },
        select: { id: true },
      });
      if (unread.length > 0) {
        const now = new Date();
        await prisma.message.updateMany({
          where: { id: { in: unread.map((m) => m.id) } },
          data: { deliveredAt: now, readAt: now },
        });
        io.to(`chat:${chatId}`).emit("messages:read", {
          chatId,
          messageIds: unread.map((m) => m.id),
          readerId: userId,
        });
      }
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
        replyToId?: string;
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
            replyToId: payload.replyToId,
          },
          include: {
            sender: true,
            replyTo: { include: { sender: true } },
          },
        });

        // Проверяем, открыт ли этот чат прямо сейчас у кого-то ещё (кроме отправителя)
        const chatRoomSockets = await io.in(`chat:${payload.chatId}`).fetchSockets();
        const recipientHasChatOpen = chatRoomSockets.some((s) => (s as any).userId !== userId);

        // Проверяем, онлайн ли вообще остальные участники чата
        const otherMembers = await prisma.chatMember.findMany({
          where: { chatId: payload.chatId, userId: { not: userId } },
        });
        let recipientOnline = false;
        for (const member of otherMembers) {
          const userRoomSockets = await io.in(`user:${member.userId}`).fetchSockets();
          if (userRoomSockets.length > 0) {
            recipientOnline = true;
            break;
          }
        }

        let deliveredAt: Date | null = null;
        let readAt: Date | null = null;
        if (recipientHasChatOpen) {
          deliveredAt = new Date();
          readAt = new Date();
        } else if (recipientOnline) {
          deliveredAt = new Date();
        }

        if (deliveredAt) {
          await prisma.message.update({
            where: { id: message.id },
            data: { deliveredAt, readAt },
          });
        }

        const status = readAt ? "read" : deliveredAt ? "delivered" : "sent";

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
          status,
          replyTo: message.replyTo
            ? {
                id: message.replyTo.id,
                type: message.replyTo.type,
                content: message.replyTo.deletedAt ? null : message.replyTo.content,
                fileName: message.replyTo.fileName,
                deleted: !!message.replyTo.deletedAt,
                sender: { displayName: message.replyTo.sender.displayName },
              }
            : null,
          sender: {
            id: message.sender.id,
            displayName: message.sender.displayName,
            avatarColor: message.sender.avatarColor,
          },
        });

        // Уведомления остальным участникам чата (кроме отправителя)
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

    // --- Редактирование сообщения ---
    socket.on("message:edit", async ({ messageId, content }: { messageId: string; content: string }) => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message || message.senderId !== userId || message.deletedAt || message.type !== "text") return;

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content, editedAt: new Date() },
      });

      io.to(`chat:${message.chatId}`).emit("message:edited", {
        chatId: message.chatId,
        id: updated.id,
        content: updated.content,
        editedAt: updated.editedAt,
      });
    });

    // --- Удаление сообщения ---
    socket.on("message:delete", async ({ messageId }: { messageId: string }) => {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message || message.senderId !== userId) return;

      await prisma.message.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          content: null,
          fileUrl: null,
          fileName: null,
          fileSize: null,
          duration: null,
        },
      });

      io.to(`chat:${message.chatId}`).emit("message:deleted", {
        chatId: message.chatId,
        id: messageId,
      });
    });

    // --- Реакции на сообщения ---
    socket.on("reaction:toggle", async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!QUICK_EMOJIS.includes(emoji)) return;
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message) return;

      const existing = await prisma.reaction.findUnique({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
      });

      if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.reaction.create({ data: { messageId, userId, emoji } });
      }

      const reactions = await prisma.reaction.findMany({ where: { messageId } });

      io.to(`chat:${message.chatId}`).emit("message:reactions", {
        chatId: message.chatId,
        messageId,
        reactions: reactions.map((r) => ({ userId: r.userId, emoji: r.emoji })),
      });
    });

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
      const lastSeenAt = new Date();
      await prisma.user.update({ where: { id: userId }, data: { status: "offline", lastSeenAt } });
      socket.broadcast.emit("presence:update", { userId, status: "offline", lastSeenAt });
    });
  });

  return io;
}
