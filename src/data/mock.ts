import type { Chat, Message, Participant } from "../types";

export const chats: Chat[] = [
  { id: 1, name: "Аня Смирнова", preview: "печатает...", time: "11:24", unread: 2, color: "#2D7CFF", online: true },
  { id: 2, name: "Команда Doger", preview: "Иван: Отличная работа!", time: "10:45", unread: 12, color: "#6B4EFF" },
  { id: 3, name: "Live Room", preview: "Смотрим вместе · 23", time: "09:30", unread: 0, color: "#2EE6C5", live: true },
  { id: 4, name: "Макс", preview: "🎤 Голосовое сообщение", time: "Вчера", unread: 0, color: "#FF4D67" },
];

export const messages: Message[] = [
  { id: 1, mine: false, text: "Привет! Как дела? 👋", time: "11:20" },
  { id: 2, mine: true, text: "Привет! Всё отлично, работаю над новым проектом 🚀", time: "11:21" },
  { id: 3, mine: false, voice: true, duration: "0:12", time: "11:22" },
  { id: 4, mine: true, text: "Очень круто! 🔥", time: "11:23" },
];

export const participants: Participant[] = [
  { name: "Иван", color: "#2D7CFF" },
  { name: "Аня", color: "#FF4D67" },
  { name: "Макс", color: "#2EE6C5" },
  { name: "Ты", color: "#6B4EFF", me: true },
  { name: "Катя", color: "#FFB84D" },
  { name: "Дима", color: "#4DA6FF" },
  { name: "Оля", color: "#FF77C8" },
];
