# apps/api -- AI instructions

NestJS 11 + Prisma 6 modular monolith with domain events (event-emitter, outbox).
Follow root `CLAUDE.md` and `.claude/rules/30-api-event-driven.md`.

- One folder per module in `src/modules/`; modules never import each other's services.
  They communicate via `EventBus.publish()` / `@OnEvent`. `catalog` is the only
  read-only exception.
- Event names `domain.action_past` in `src/infra/events/event-names.ts`; listeners idempotent.
- Input validated with zod schemas from `@oneimpact/shared` (`nestjs-zod`). No class-validator.
- Auth: JWT (access 15m / refresh 30d rotated), argon2, `@Public()`, `@Roles('ADMIN')`.
- Payments are simulated; never accept or log a full card number.
- Prisma enums mirror `packages/shared` enums; change both in the same commit.
- Seed (`prisma/seed.ts`) is idempotent and shared by demo, e2e and mobile MSW.
- Commands: `pnpm dev`, `pnpm test`, `pnpm test:e2e` (needs `pnpm db:up` at root),
  `pnpm prisma:migrate`, `pnpm prisma:seed`. Swagger at `/docs`.
