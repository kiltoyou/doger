import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listNotifications, markAllRead } from "../controllers/notifications.controller";

const router = Router();

router.use(requireAuth);
router.get("/", listNotifications);
router.post("/read-all", markAllRead);

export default router;
