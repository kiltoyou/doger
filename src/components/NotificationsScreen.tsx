import React, { useEffect, useState } from "react";
import { MessageCircle, AtSign, Radio, Trophy } from "lucide-react";
import GlassCard from "./GlassCard";
import { api } from "../lib/api";
import { connectSocket } from "../lib/socket";

interface NotificationItem {
  id: string;
  type: "message" | "mention" | "live" | "achievement";
  title: string;
  subtitle: string;
  createdAt: string;
  read: boolean;
}

const iconFor: Record<string, typeof MessageCircle> = {
  message: MessageCircle,
  mention: AtSign,
  live: Radio,
  achievement: Trophy,
};

const colorFor: Record<string, string> = {
  message: "#2D7CFF",
  mention: "#6B4EFF",
  live: "#2EE6C5",
  achievement: "#FFB84D",
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getNotifications()
      .then(({ notifications }) => setItems(notifications))
      .finally(() => setLoading(false));

    api.markNotificationsRead().catch(() => {});

    const socket = connectSocket();
    const onNew = (notification: NotificationItem) => {
      setItems((prev) => [notification, ...prev]);
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col px-8 py-6 max-w-xl overflow-y-auto">
      <h1 className="text-white text-xl font-semibold tracking-tight mb-5">Уведомления</h1>

      {loading && <div className="text-xs text-[#66708A] text-center py-6">Загрузка...</div>}

      {!loading && items.length === 0 && (
        <div className="text-xs text-[#66708A] text-center py-6">
          Пока нет уведомлений — они появятся, когда кто-то напишет тебе сообщение.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((n) => {
          const Icon = iconFor[n.type] || MessageCircle;
          const color = colorFor[n.type] || "#2D7CFF";
          return (
            <GlassCard
              key={n.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: n.read ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)" }}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
                <Icon size={16} color={color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium">{n.title}</div>
                <div className="text-xs text-[#8A93A6] truncate">{n.subtitle}</div>
              </div>
              <span className="text-[11px] text-[#66708A] shrink-0">{timeAgo(n.createdAt)}</span>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
