# Doger Backend

REST API + WebSocket сервер для мессенджера Doger.

## Стек
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM (в т.ч. бесплатный облачный Neon — см. `../DEPLOY.md`)
- JWT-авторизация
- Socket.IO (realtime сообщения, присутствие, Live Room)

## Локальная установка

> ⚠️ Если ты уже запускал проект раньше на SQLite — удали папку `backend/prisma/migrations` и файл `backend/prisma/dev.db` перед следующими шагами (мы перешли на PostgreSQL, старые миграции с ним несовместимы).

1. Заведи бесплатную базу на https://neon.tech (2 минуты, без карты) и скопируй connection string
2. Скопируй `.env.example` в `.env` и впиши туда свою строку из Neon в `DATABASE_URL`:

```bash
cp .env.example .env
```

3. Установи зависимости и накати миграции:

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
```

Сид создаст двух тестовых пользователей:
- `alexey@doger.app` / `password123`
- `anya@doger.app` / `password123`

и один чат с парой сообщений между ними.

4. Запусти сервер:

```bash
npm run dev
```

Сервер поднимется на `http://localhost:4000`.

## Чтобы играть с другом онлайн

Локальный сервер видишь только ты. Чтобы друг мог зайти с другого компьютера — нужно выложить backend и frontend в интернет. Подробная бесплатная инструкция (Neon + Render + Netlify) — в файле `../DEPLOY.md`.

## API

### Авторизация
- `POST /api/auth/register` — `{ username, email, password, displayName }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — текущий пользователь (нужен `Authorization: Bearer <token>`)

### Чаты
- `GET /api/chats` — список чатов текущего пользователя
- `POST /api/chats` — создать чат `{ type, name?, memberIds }`
- `GET /api/chats/:chatId/messages` — история сообщений
- `POST /api/chats/:chatId/messages` — отправить сообщение (REST-вариант; для realtime используй сокет)

### Live Room
- `GET /api/live-rooms/:chatId` — состояние комнаты
- `POST /api/live-rooms/:chatId/join` — присоединиться
- `POST /api/live-rooms/:chatId/leave` — выйти

### Пользователи
- `GET /api/users?q=...` — поиск людей по имени/юзернейму
- `POST /api/users/direct-chat` — `{ userId }` — найти или создать личный чат

### Загрузка файлов
- `POST /api/uploads` — multipart/form-data, поле `file` (до 25 МБ) → `{ url, fileName, fileSize, mimeType }`. Файлы отдаются статически по `/uploads/...`.

### Уведомления
- `GET /api/notifications` — последние 50 уведомлений текущего пользователя
- `POST /api/notifications/read-all` — пометить все прочитанными

Уведомление создаётся автоматически для всех участников чата (кроме отправителя) при каждом новом сообщении, и доставляется мгновенно через сокет-событие `notification:new`, если получатель онлайн.

## WebSocket события

Подключение с токеном:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { auth: { token } });
```

| Событие (клиент → сервер) | Payload |
|---|---|
| `chat:join` | `chatId` |
| `chat:leave` | `chatId` |
| `chat:typing` | `{ chatId }` |
| `message:send` | `{ chatId, type?, content?, fileUrl?, fileName?, duration? }` |
| `live:join` | `chatId` |
| `live:leave` | `chatId` |
| `live:toggle` | `{ chatId, field: "cameraOn"\|"micOn"\|"screenOn", value }` |

| Событие (сервер → клиент) | Payload |
|---|---|
| `message:new` | новое сообщение |
| `chat:typing` | `{ chatId, userId }` |
| `presence:update` | `{ userId, status }` |
| `live:participant-joined` / `live:participant-left` | `{ userId }` |
| `live:toggle` | `{ userId, field, value }` |

## Дальше по плану

- [ ] Загрузка файлов/войсов (S3-совместимое хранилище)
- [ ] Refresh-токены
- [ ] Пагинация сообщений
- [ ] WebRTC-сигналинг для настоящих видео/аудио звонков в Live Room (текущий `live:toggle` — только синхронизация состояния UI)
