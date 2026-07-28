import { Response } from "express";
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/auth";

export async function getLiveRoom(req: AuthRequest, res: Response) {
  const { chatId } = req.params;

  const liveRoom = await prisma.liveRoom.findUnique({
    where: { chatId },
    include: { participants: { include: { user: true } } },
  });

  if (!liveRoom) return res.status(404).json({ error: "Live Room не найдена" });

  return res.json({
    liveRoom: {
      id: liveRoom.id,
      title: liveRoom.title,
      mediaUrl: liveRoom.mediaUrl,
      mediaTitle: liveRoom.mediaTitle,
      mediaElapsed: liveRoom.mediaElapsed,
      isActive: liveRoom.isActive,
      participants: liveRoom.participants.map((p) => ({
        id: p.user.id,
        displayName: p.user.displayName,
        avatarColor: p.user.avatarColor,
        cameraOn: p.cameraOn,
        micOn: p.micOn,
        screenOn: p.screenOn,
        me: p.userId === req.userId,
      })),
    },
  });
}

export async function joinLiveRoom(req: AuthRequest, res: Response) {
  const { chatId } = req.params;

  let liveRoom = await prisma.liveRoom.findUnique({ where: { chatId } });
  if (!liveRoom) {
    liveRoom = await prisma.liveRoom.create({ data: { chatId } });
  }

  const participant = await prisma.liveRoomParticipant.upsert({
    where: { liveRoomId_userId: { liveRoomId: liveRoom.id, userId: req.userId! } },
    update: {},
    create: { liveRoomId: liveRoom.id, userId: req.userId! },
  });

  return res.status(200).json({ participant });
}

export async function leaveLiveRoom(req: AuthRequest, res: Response) {
  const { chatId } = req.params;

  const liveRoom = await prisma.liveRoom.findUnique({ where: { chatId } });
  if (!liveRoom) return res.status(404).json({ error: "Live Room не найдена" });

  await prisma.liveRoomParticipant.deleteMany({
    where: { liveRoomId: liveRoom.id, userId: req.userId! },
  });

  return res.status(204).send();
}
