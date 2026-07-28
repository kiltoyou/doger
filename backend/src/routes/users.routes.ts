import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { searchUsers, startDirectChat } from "../controllers/users.controller";

const router = Router();

router.use(requireAuth);
router.get("/", searchUsers);
router.post("/direct-chat", startDirectChat);

export default router;
