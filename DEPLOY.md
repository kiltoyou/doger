# Как выложить Doger в интернет (чтобы друг мог зайти)

Три бесплатных сервиса, без карты:
- **Neon** — база данных (PostgreSQL)
- **Render** — backend (сервер)
- **Netlify** — frontend (сам сайт)

Порядок важен: сначала база → потом backend → потом frontend (потому что frontend должен знать адрес backend).

---

## Шаг 0. Залей код на GitHub

1. Зайди на https://github.com → New repository → назови, например, `doger` → Create repository (без README, просто пустой репозиторий)
2. У себя в папке `doger-project\doger` (там, где лежит и backend, и фронтенд вместе) открой терминал и выполни:

```powershell
git init
git add .
git commit -m "Первая версия Doger"
git branch -M main
git remote add origin https://github.com/ТВОЙ_НИК/doger.git
git push -u origin main
```

Если попросит войти — авторизуйся через браузер, GitHub сам подскажет как.

---

## Шаг 0.5. Если раньше уже запускал локально на SQLite

Удали у себя локально:
- `doger\backend\prisma\migrations` (папку целиком)
- `doger\backend\prisma\dev.db` (файл)

Мы перешли на PostgreSQL — старые SQLite-миграции с ним несовместимы, новые создадутся автоматически при следующем `npm run prisma:migrate`.

---

## Шаг 1. База данных (Neon)

1. Зайди на https://neon.tech → зарегистрируйся (можно через GitHub-аккаунт)
2. Create a project → любое имя, регион ближе к тебе
3. На странице проекта найди **Connection string** — она выглядит так:
   ```
   postgresql://имя:пароль@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Скопируй её — она понадобится в следующем шаге. **Сохрани куда-нибудь, она больше нигде не покажется в открытом виде.**

---

## Шаг 2. Backend (Render)

1. Зайди на https://render.com → зарегистрируйся через GitHub
2. New → Web Service → выбери свой репозиторий `doger`
3. Настройки:
   - **Name**: `doger-backend` (или любое)
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run prisma:generate && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Ниже, в **Environment Variables**, добавь:
   | Ключ | Значение |
   |---|---|
   | `DATABASE_URL` | строка из Neon (шаг 1) |
   | `JWT_SECRET` | любая длинная случайная строка, например `sd8f7a6sdf87a6sdf876a5sdf` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_ORIGIN` | пока поставь `http://localhost:5173` — поправим на шаге 4 |
5. Нажми **Create Web Service** и подожди 2-5 минут, пока соберётся
6. Когда задеплоится, вверху будет адрес вида `https://doger-backend.onrender.com` — **скопируй его**, он нужен для фронтенда

> ⚠️ Бесплатный Render "засыпает" после 15 минут без запросов и просыпается ~30-50 секунд при первом обращении. Для теста с другом это нормально — просто первое сообщение может прийти с задержкой.

Проверка: открой `https://doger-backend.onrender.com/health` — должно показать `{"status":"ok"}`.

---

## Шаг 3. Frontend (Netlify)

Собери сайт **локально**, с адресом backend внутри:

1. В папке `doger` (фронтенд, НЕ backend) создай/открой файл `.env` и впиши:
   ```
   VITE_API_URL=https://doger-backend.onrender.com
   ```
   (свой адрес с шага 2, без слэша на конце)

2. Собери проект:
   ```powershell
   cd doger
   npm install
   npm run build
   ```
   Появится папка `dist` — это уже готовый сайт.

3. Зайди на https://app.netlify.com → залогинься → **Add new site → Deploy manually**
4. Перетащи именно папку **`dist`** (не `doger`!) в область загрузки
5. Netlify даст адрес вида `https://random-name-123.netlify.app` — **скопируй его**

---

## Шаг 4. Разреши frontend достучаться до backend

Вернись в Render (шаг 2) → твой сервис → **Environment**:
- Поменяй `CLIENT_ORIGIN` на адрес из Netlify (шаг 3), например:
  ```
  CLIENT_ORIGIN=https://random-name-123.netlify.app
  ```
- Сохрани — Render автоматически передеплоит сервис (подождать ~1-2 минуты)

---

## Готово 🎉

Скинь другу ссылку `https://random-name-123.netlify.app` — он открывает её, регистрируется, и вы оба видите один и тот же Doger, оба можете найти друг друга через вкладку **Поиск** и написать.

## Если что-то не работает

- Белый экран / ошибка в консоли → проверь, что в `doger/.env` правильный `VITE_API_URL` и что `npm run build` выполнялся **после** того, как ты его туда вписал
- "Failed to fetch" → скорее всего backend на Render ещё "спит", подожди 30-50 сек и обнови страницу
- Не находит друга через поиск → оба должны быть зарегистрированы через **один и тот же** сайт на Netlify (не через localhost у себя)
