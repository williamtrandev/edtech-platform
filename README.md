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
- `REDIS_URL`
- `SUPABASE_JWT_SECRET`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional backend:

- `SUPABASE_URL` — Project API URL (e.g. `https://xxxx.supabase.co`). **Required** if Supabase issues **RS256/ES256** access tokens (default on newer projects). Used with JWKS at `/auth/v1/.well-known/jwks.json`. Same value as frontend `VITE_SUPABASE_URL` without `/auth/v1` path.
- `LOG_PRETTY` — `true` or `false`. When omitted, logs are pretty in `development` and JSON in `production`.
- `LOG_LEVEL` — `fatal` | `error` | `warn` | `info` | `debug` | `trace` (default `info`). Use response header `X-Request-Id` to correlate `request_completed` and error lines.

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
