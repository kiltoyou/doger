import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import authRoutes from "./routes/auth.routes";
import chatsRoutes from "./routes/chats.routes";
import liveRoomRoutes from "./routes/liveRoom.routes";
import usersRoutes from "./routes/users.routes";
import notificationsRoutes from "./routes/notifications.routes";
import uploadsRoutes from "./routes/uploads.routes";
import { setupSockets } from "./sockets";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Не разрешено CORS-политикой"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/live-rooms", liveRoomRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/uploads", uploadsRoutes);

const httpServer = createServer(app);
setupSockets(httpServer, ALLOWED_ORIGINS);

httpServer.listen(PORT, () => {
  console.log(`Doger backend запущен на http://localhost:${PORT}`);
});
