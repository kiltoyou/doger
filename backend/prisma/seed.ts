import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const alexey = await prisma.user.upsert({
    where: { email: "alexey@doger.app" },
    update: {},
    create: {
      username: "alexey.doger",
      email: "alexey@doger.app",
      passwordHash,
      displayName: "Алексей Петров",
      avatarColor: "#6B4EFF",
      isPremium: true,
      mood: "В отличном настроении 😎",
    },
  });

  const anya = await prisma.user.upsert({
    where: { email: "anya@doger.app" },
    update: {},
    create: {
      username: "anya.smirnova",
      email: "anya@doger.app",
      passwordHash,
      displayName: "Аня Смирнова",
      avatarColor: "#2D7CFF",
      status: "online",
    },
  });

  const chat = await prisma.chat.create({
    data: {
      type: "direct",
      members: {
        create: [
          { userId: alexey.id, role: "owner" },
          { userId: anya.id, role: "member" },
        ],
      },
      messages: {
        create: [
          { senderId: anya.id, type: "text", content: "Привет! Как дела? 👋" },
          { senderId: alexey.id, type: "text", content: "Привет! Всё отлично, работаю над новым проектом 🚀" },
        ],
      },
    },
  });

  const trophy = await prisma.achievement.upsert({
    where: { code: "active_member" },
    update: {},
    create: {
      code: "active_member",
      title: "Активный участник",
      description: "Отправлено 100+ сообщений",
      icon: "Trophy",
      color: "#FFB84D",
    },
  });

  await prisma.userAchievement.upsert({
    where: { userId_achievementId: { userId: alexey.id, achievementId: trophy.id } },
    update: {},
    create: { userId: alexey.id, achievementId: trophy.id },
  });

  console.log("Сид данные созданы:", { alexey: alexey.email, anya: anya.email, chat: chat.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
