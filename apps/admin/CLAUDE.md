# apps/admin -- AI instructions

Next.js 16 App Router + Tailwind 4 + shadcn/ui + Playwright, port 3001.
Follow root `CLAUDE.md` and `.claude/rules/40-admin-conventions.md`.

- Same visual system as the mobile app: tokens in `src/app/globals.css` (`@theme`),
  Geist, pills, cream background, forest sidebar.
- Server Components by default; `'use client'` only for forms, interactive tables, charts.
- Admin session in an httpOnly cookie set by `src/app/api/auth/*` route handlers; the
  token never touches localStorage. `src/middleware.ts` enforces ADMIN role.
- Forms: react-hook-form + zodResolver with `@oneimpact/shared` schemas.
- Image upload: request a signed URL from the API, upload directly to Supabase Storage.
- Playwright specs in `e2e/`; selectors by role/label; `storageState` for login.
- Commands: `pnpm dev`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.
