# apps/admin -- AI instructions

Next.js 16 App Router + Tailwind 4 + shadcn/ui + Playwright, port 5001.
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
