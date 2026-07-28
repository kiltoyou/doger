import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listChats, createChat, getMessages, sendMessage } from "../controllers/chats.controller";

const router = Router();

router.use(requireAuth);
router.get("/", listChats);
router.post("/", createChat);
router.get("/:chatId/messages", getMessages);
router.post("/:chatId/messages", sendMessage);

export default router;
