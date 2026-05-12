# EdTech Platform

Single-source TypeScript project containing both backend and frontend applications in one root workspace.

## Structure

```text
edtech-platform/
  backend/
    prisma/
    src/
  frontend/
    src/
  .env.example
  package.json
```

## Stack

- Backend: Express, Prisma `5.11.0`, Redis, BullMQ, Zod
- Frontend: React, Vite, TailwindCSS, React Query, React Hook Form
- Auth: Supabase JWT verification in backend

## Setup

```bash
cp .env.example .env
npm install
```

## Required Environment Variables

- `NODE_ENV`
- `PORT`
- `SUPABASE_DB_URL`
- `SUPABASE_DIRECT_URL`
- `SUPABASE_SECRET_KEY` (server-only, never expose to frontend)
- `REDIS_URL`
- `SUPABASE_JWT_SECRET`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Development Commands

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run prisma:generate`
- `npm run prisma:migrate`

## Build Commands

- `npm run build:backend`
- `npm run build:frontend`
- `npm run build`

## Runtime

- Backend default URL: `http://localhost:4000`
- Frontend default URL: `http://localhost:5173`
