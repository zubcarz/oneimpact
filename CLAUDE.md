# One Impact monorepo - conventions for AI agents

- pnpm workspaces + Turborepo. Apps: `apps/mobile` (Expo SDK 57, expo-router, NativeWind 4), `apps/api` (NestJS 11, Prisma 6, event-driven modular monolith), `apps/admin` (Next.js 16, Tailwind 4). Shared: `packages/shared` (zod schemas, enums, plans), `packages/ui-tokens`, `packages/api-client`, `packages/config`.
- Folder/file/route names in English. User-facing copy in Spanish.
- Design tokens live in `packages/ui-tokens` (mirrored in `apps/admin/src/app/globals.css`). Never hardcode brand hex in components.
- Mobile: NativeWind classes (copied from the original Tailwind web where possible); class order layout -> spacing -> color -> typography -> effects. Screens in `app/`, sections in `src/features/<feature>`, generic UI in `src/components/ui`.
- API: one folder per module under `src/modules`. Modules talk only through domain events (`@nestjs/event-emitter`, outbox pattern) or `catalog` read-only. Validate input with zod schemas from `packages/shared`.
- Payments are simulated: the server only receives `{brand,last4,holder,expMonth,expYear}`; Luhn runs on the client.
- Tests: vitest in packages/admin, jest in api/mobile, Playwright in `apps/admin/e2e`. Run `pnpm typecheck && pnpm test` before committing.
- Conventional Commits with scope: `feat(mobile): ...`, `feat(api): ...`, `feat(admin): ...`, `chore(ci): ...`.
