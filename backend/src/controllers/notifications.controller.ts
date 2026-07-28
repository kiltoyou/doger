import { Response } from "express";
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/auth";

export async function listNotifications(req: AuthRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ notifications });
}

export async function markAllRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.userId, read: false },
    data: { read: true },
  });
  return res.status(204).send();
}
