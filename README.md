# One Impact

Monorepo for the One Impact platform: mobile app (React Native + Expo), event-driven API (NestJS) and admin panel (Next.js).

> Technical test: mobile replica of https://d3foiidvo1xvi7.cloudfront.net/ extended with a logged-in area, simulated subscription payment, projects with verified progress and an admin panel.

## Structure
```
apps/
  mobile/   Expo SDK 57 · expo-router · NativeWind 4 · TanStack Query
  api/      NestJS 11 · Prisma 6 · @nestjs/event-emitter (modular monolith, outbox)
  admin/    Next.js 16 · Tailwind 4 · Playwright
packages/
  shared/      zod schemas, enums, plans (single contract for API + clients)
  ui-tokens/   design tokens (colors, radius) for mobile and admin
  api-client/  typed fetch client
  config/      shared tsconfig
docs/          ADRs, AI workflow notes, demo GIF
```

## Requirements
Node 20+, pnpm 9 (`corepack enable`), Docker (optional, local Postgres), Expo Go on your phone.

## Setup
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env
```

## Run
```bash
pnpm dev:api      # http://localhost:3000  (Swagger: /docs, health: /health)
pnpm dev:admin    # http://localhost:3001
pnpm dev:mobile   # Expo dev server -> scan QR with Expo Go
```
Local database: `pnpm db:up` (Docker Postgres 16) then `pnpm db:setup` (migrate + seed). One-shot: `pnpm setup`. Full guide: `docs/local-development.md`.

## Quality
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @oneimpact/api test:e2e
pnpm --filter @oneimpact/admin test:e2e   # Playwright
```

## Demo
_GIF pending (docs/demo.gif)._

## How AI was used
See `docs/ai-workflow.md` (pending).
