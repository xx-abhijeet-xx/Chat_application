# NexChat 2.0

A full-stack real-time chat app — Telegram/Snapchat-style messaging with friend requests, media sharing, and live presence.

## Features
- 🔐 JWT authentication (register / login)
- 🔍 Search users by username
- 👥 Friend request system (send / accept / reject)
- 💬 Direct messaging between friends
- 🖼️ Send images, videos, audio, files, stickers
- 👤 Profile panel opens only when you click the profile icon
- 🟢 Online/offline presence
- 📱 Clean dark UI — no test/demo data

---

## ✅ Setup (just change .env, nothing else)

### 1. Copy env file
```
cp .env.example .env
```
Then fill in `.env` with your real values (see below).

---

### 2. PostgreSQL — Supabase (free)
1. Go to https://supabase.com → New project
2. Settings → Database → copy the **Connection string** (URI)
3. Paste as `DATABASE_URL` in `.env`

---

### 3. Redis — Upstash (free)
1. Go to https://console.upstash.com → Create Database
2. Choose **Regional** → Mumbai (or closest)
3. Click database → copy **REDIS_URL** (starts with `rediss://`)
4. Paste as `REDIS_URL` in `.env`

---

### 4. JWT Secrets
Run this twice in PowerShell/terminal:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Paste the two different outputs as `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

---

### 5. Install & run
```powershell
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000 → register two accounts in different tabs → search each other → send friend request → accept → chat!

---

## .env example
```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.YOURREF.supabase.co:5432/postgres"
REDIS_URL="rediss://default:TOKEN@HOST.upstash.io:6380"
JWT_ACCESS_SECRET="base64-secret-1"
JWT_REFRESH_SECRET="base64-secret-2"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Tech Stack
- **Next.js 14** (App Router) + TypeScript
- **PostgreSQL** + Prisma ORM
- **Redis** (Upstash) for pub/sub & presence
- **JWT** (access + refresh tokens)
- **Tailwind CSS** — dark cyberpunk UI
- **bcryptjs** — password hashing
- **zod** — input validation
