import type { Chat, Participant } from "../types";

export const searchSuggestions = [
  { id: 1, type: "person", name: "Аня Смирнова", subtitle: "@anya.smirnova", color: "#2D7CFF" },
  { id: 2, type: "channel", name: "Новости технологий", subtitle: "12 400 подписчиков", color: "#6B4EFF" },
  { id: 3, type: "group", name: "Команда Doger", subtitle: "8 участников", color: "#2EE6C5" },
  { id: 4, type: "person", name: "Макс Волков", subtitle: "@max.volkov", color: "#FF4D67" },
];

export interface NotificationItem {
  id: number;
  title: string;
  subtitle: string;
  time: string;
  color: string;
  icon: "message" | "mention" | "live" | "achievement";
}

export const notifications: NotificationItem[] = [
  { id: 1, title: "Аня Смирнова", subtitle: "Отправила голосовое сообщение", time: "2 мин назад", color: "#2D7CFF", icon: "message" },
  { id: 2, title: "Команда Doger", subtitle: "Иван упомянул тебя в чате", time: "15 мин назад", color: "#6B4EFF", icon: "mention" },
  { id: 3, title: "Live Room", subtitle: "Начался совместный просмотр «Интерстеллар»", time: "1 ч назад", color: "#2EE6C5", icon: "live" },
  { id: 4, title: "Новое достижение", subtitle: "Ты получил значок «Активный участник»", time: "Вчера", color: "#FFB84D", icon: "achievement" },
];
