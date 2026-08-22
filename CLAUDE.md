# One Impact -- AI instructions

Monorepo for the One Impact platform: mobile app (Expo), event-driven API (NestJS)
and admin panel (Next.js). Built for a technical test whose evaluation includes
**how AI agents are integrated into the workflow**, so this folder structure is
part of the deliverable.

**Docs:** [README.md](README.md) · [Local development](docs/local-development.md) ·
[AI workflow log](docs/ai-workflow.md) · [ADRs](docs/adr/)
**Design and architecture source of truth:** Obsidian vault `C:\machine\Notes\oneimpact`
(`01-Tecnologia-Arquitectura/` for architecture, `02-Analisis-Visual/` for screen specs and tokens).

## Structure

```
apps/mobile      Expo SDK 57 + expo-router + NativeWind 4   (apps/mobile/CLAUDE.md)
apps/api         NestJS 11 + Prisma 6, modular monolith, domain events + outbox (apps/api/CLAUDE.md)
apps/admin       Next.js 16 + Tailwind 4 + Playwright       (apps/admin/CLAUDE.md)
packages/shared  zod schemas, enums, plans -- the single API<->client contract
packages/ui-tokens · packages/api-client · packages/config
docs/            ADRs, ai-workflow.md, local-development.md
.claude/         rules, agents, commands, skills, plans, findings (versioned on purpose)
.wip/            personal scratch, gitignored
```

## Rules (load as needed)

| Topic | File |
|---|---|
| What can be touched, git policy, language, AI log | [.claude/rules/00-base-rules.md](.claude/rules/00-base-rules.md) |
| Monorepo layout, dependency direction, tooling pins | [.claude/rules/10-monorepo-conventions.md](.claude/rules/10-monorepo-conventions.md) |
| Mobile: NativeWind, expo-router, media, auth, MSW | [.claude/rules/20-mobile-conventions.md](.claude/rules/20-mobile-conventions.md) |
| API: module boundaries, events, outbox, simulated payments, roles | [.claude/rules/30-api-event-driven.md](.claude/rules/30-api-event-driven.md) |
| Admin: App Router, cookie auth, shadcn, Playwright | [.claude/rules/40-admin-conventions.md](.claude/rules/40-admin-conventions.md) |
| Testing per layer, `quality-check.sh`, verification rules | [.claude/rules/50-testing-and-verification.md](.claude/rules/50-testing-and-verification.md) |
| Design system: tokens, shapes, typography, button variants | [.claude/rules/60-design-system.md](.claude/rules/60-design-system.md) |

Skill `oneimpact-context` loads all of them at session start.

## Workflow: plan -> execute -> verify -> log

1. `/gen-plan <feature>` writes a phased plan to `.claude/plans/` (analysis only).
2. Execute with `/run-plan-guided` (default: gate per phase, user commits),
   `/run-plan-autonomous` (commits per phase on the current branch) or
   `/run-plan-worktree` (isolated worktree, then `/merge-plan`).
3. Execution delegates to the agents `implementer` (one task per call),
   `verifier` (runs `scripts/dev/quality-check.sh`, never edits) and `debugger`
   (max 3 attempts). Review orchestrator `review` fans out to
   `review/rv-*.md` sub-agents (architecture boundaries, security, UX fidelity).
4. `/ai-log` appends the session to `docs/ai-workflow.md` -- required deliverable.

Generators: `/gen-screen` (mobile screen from its vault spec), `/gen-module`
(NestJS event-driven module), `/gen-admin-page`. Checks: `/verify`, `/review-pr`.

## Hard rules (short version)

- Code, folders, routes, identifiers, commits in **English**; user-facing copy in **Spanish**.
- Colors only through tokens; never raw hex in components.
- API modules communicate only via domain events (or read-only `catalog`).
- Simulated payment: the full card number never reaches the server or a log.
- Validation schemas live once, in `packages/shared`, used by API and clients.
- Conventional Commits with scope (`feat(mobile): ...`); hook validates. `git add` with explicit files.
- No new `eslint-disable` / `@ts-ignore`; no weakening tests to go green.
- No emojis in code, logs, commits or repo docs.
- `pnpm typecheck && pnpm test` green before any commit.

## Common commands

```bash
pnpm run setup        # install + docker postgres + migrate + seed (bare "pnpm setup" is a pnpm built-in)
pnpm dev:api | dev:admin | dev:mobile | dev:all
pnpm typecheck | lint | test | build
bash scripts/dev/quality-check.sh --scope all
pnpm --filter @oneimpact/api test:e2e      # needs pnpm db:up
pnpm --filter @oneimpact/admin test:e2e    # Playwright
```
