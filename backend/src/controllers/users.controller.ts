import { Response } from "express";
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/auth";

export async function searchUsers(req: AuthRequest, res: Response) {
  const q = (req.query.q as string) || "";

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.userId },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { displayName: "asc" },
  });

  return res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarColor: u.avatarColor,
      status: u.status,
    })),
  });
}

export async function startDirectChat(req: AuthRequest, res: Response) {
  const { userId: otherUserId } = req.body as { userId: string };
  if (!otherUserId) return res.status(400).json({ error: "Не указан пользователь" });

  const existing = await prisma.chat.findFirst({
    where: {
      type: "direct",
      AND: [
        { members: { some: { userId: req.userId! } } },
        { members: { some: { userId: otherUserId } } },
      ],
    },
  });

  if (existing) return res.json({ chat: existing });

  const chat = await prisma.chat.create({
    data: {
      type: "direct",
      members: {
        create: [
          { userId: req.userId!, role: "owner" },
          { userId: otherUserId, role: "member" },
        ],
      },
    },
  });

  return res.status(201).json({ chat });
}
