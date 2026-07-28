import { Response } from "express";
import type { AuthRequest } from "../middleware/auth";

export async function uploadFile(req: AuthRequest, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: "Файл не найден" });

  const url = `/uploads/${file.filename}`;
  return res.status(201).json({
    url,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  });
}
