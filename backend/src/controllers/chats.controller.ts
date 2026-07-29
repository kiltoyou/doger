import { Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/auth";

export async function listChats(req: AuthRequest, res: Response) {
  const memberships = await prisma.chatMember.findMany({
    where: { userId: req.userId },
    include: {
      chat: {
        include: {
          members: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          liveRoom: true,
        },
      },
    },
  });

  const chats = await Promise.all(
    memberships.map(async ({ chat }) => {
      const lastMessage = chat.messages[0] ?? null;
      const otherMembers = chat.members.filter((m) => m.userId !== req.userId);

      const unreadCount = await prisma.message.count({
        where: { chatId: chat.id, senderId: { not: req.userId }, readAt: null },
      });

      return {
        id: chat.id,
        type: chat.type,
        name: chat.name ?? otherMembers[0]?.user.displayName ?? "Чат",
        preview: lastMessage
          ? lastMessage.deletedAt
            ? "Сообщение удалено"
            : lastMessage.type === "voice"
            ? "🎤 Голосовое сообщение"
            : lastMessage.type === "file"
            ? `📎 ${lastMessage.fileName}`
            : lastMessage.content
          : "",
        lastMessageAt: lastMessage?.createdAt ?? chat.createdAt,
        isLive: !!chat.liveRoom?.isActive,
        unreadCount,
        members: chat.members.map((m) => ({
          id: m.user.id,
          displayName: m.user.displayName,
          avatarColor: m.user.avatarColor,
          status: m.user.status,
          lastSeenAt: m.user.lastSeenAt,
        })),
      };
    })
  );

  chats.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return res.json({ chats });
}

const createChatSchema = z.object({
  type: z.enum(["direct", "group", "channel"]),
  name: z.string().optional(),
  memberIds: z.array(z.string()).min(1),
});

export async function createChat(req: AuthRequest, res: Response) {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некорректные данные" });
  const { type, name, memberIds } = parsed.data;

  const allMemberIds = Array.from(new Set([req.userId!, ...memberIds]));

  const chat = await prisma.chat.create({
    data: {
      type,
      name,
      members: {
        create: allMemberIds.map((userId) => ({
          userId,
          role: userId === req.userId ? "owner" : "member",
        })),
      },
    },
    include: { members: true },
  });

  return res.status(201).json({ chat });
}

export async function getMessages(req: AuthRequest, res: Response) {
  const { chatId } = req.params;

  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
  });
  if (!membership) return res.status(403).json({ error: "Нет доступа к этому чату" });

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: true,
      replyTo: { include: { sender: true } },
      reactions: true,
    },
  });

  return res.json({
    messages: messages.map((m) => ({
      id: m.id,
      mine: m.senderId === req.userId,
      type: m.type,
      content: m.deletedAt ? null : m.content,
      fileUrl: m.deletedAt ? null : m.fileUrl,
      fileName: m.fileName,
      fileSize: m.fileSize,
      duration: m.duration,
      createdAt: m.createdAt,
      editedAt: m.editedAt,
      deleted: !!m.deletedAt,
      status: m.readAt ? "read" : m.deliveredAt ? "delivered" : "sent",
      replyTo: m.replyTo
        ? {
            id: m.replyTo.id,
            type: m.replyTo.type,
            content: m.replyTo.deletedAt ? null : m.replyTo.content,
            fileName: m.replyTo.fileName,
            deleted: !!m.replyTo.deletedAt,
            sender: { displayName: m.replyTo.sender.displayName },
          }
        : null,
      reactions: m.reactions.map((r) => ({ userId: r.userId, emoji: r.emoji })),
      sender: { id: m.sender.id, displayName: m.sender.displayName, avatarColor: m.sender.avatarColor },
    })),
  });
}

const sendMessageSchema = z.object({
  type: z.enum(["text", "voice", "file", "image"]).default("text"),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  duration: z.number().optional(),
  replyToId: z.string().optional(),
});

export async function sendMessage(req: AuthRequest, res: Response) {
  const { chatId } = req.params;
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некорректные данные" });

  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId: req.userId! } },
  });
  if (!membership) return res.status(403).json({ error: "Нет доступа к этому чату" });

  const message = await prisma.message.create({
    data: { chatId, senderId: req.userId!, ...parsed.data },
    include: { sender: true },
  });

  return res.status(201).json({ message });
}
