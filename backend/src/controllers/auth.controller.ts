import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { signToken } from "../utils/jwt";
import type { AuthRequest } from "../middleware/auth";

const registerSchema = z.object({
  username: z.string().min(3).max(24),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(48),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const AVATAR_COLORS = ["#2D7CFF", "#6B4EFF", "#2EE6C5", "#FF4D67", "#FFB84D", "#FF77C8"];

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
  }
  const { username, email, password, displayName } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    return res.status(409).json({ error: "Пользователь с таким email или именем уже существует" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await prisma.user.create({
    data: { username, email, passwordHash, displayName, avatarColor },
  });

  const token = signToken({ userId: user.id });
  return res.status(201).json({
    token,
    user: toPublicUser(user),
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Некорректные данные" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  await prisma.user.update({ where: { id: user.id }, data: { status: "online" } });

  const token = signToken({ userId: user.id });
  return res.json({ token, user: toPublicUser(user) });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  return res.json({ user: toPublicUser(user) });
}

function toPublicUser(user: {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl: string | null;
  status: string;
  mood: string | null;
  isPremium: boolean;
}) {
  const { id, username, displayName, avatarColor, avatarUrl, status, mood, isPremium } = user;
  return { id, username, displayName, avatarColor, avatarUrl, status, mood, isPremium };
}
