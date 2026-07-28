import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getLiveRoom, joinLiveRoom, leaveLiveRoom } from "../controllers/liveRoom.controller";

const router = Router();

router.use(requireAuth);
router.get("/:chatId", getLiveRoom);
router.post("/:chatId/join", joinLiveRoom);
router.post("/:chatId/leave", leaveLiveRoom);

export default router;
