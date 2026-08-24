# One Impact

[![CI](https://github.com/zubcarz/oneimpact/actions/workflows/ci.yml/badge.svg)](https://github.com/zubcarz/oneimpact/actions/workflows/ci.yml)

Mobile-first replica and extension of the [One Impact landing page](https://d3foiidvo1xvi7.cloudfront.net/), built as a technical test whose explicit brief includes **showing how AI-assisted development is integrated into a real workflow**.

The brief was "replicate the site as a React Native/Expo app, adapt what makes sense for mobile." Taken further on purpose: the public site is translated screen by screen into `apps/mobile`, then extended with a logged-in area (auth, a simulated subscription payment, a project-following journey) backed by an event-driven NestJS API, plus a Next.js admin panel to manage that data. All three apps share one contract (`packages/shared`) enforced by the type system, not by convention, inside a single pnpm/Turborepo monorepo.

## Stack

| App / package                                  | Stack                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/mobile`                                  | Expo SDK 57 · expo-router · NativeWind 4 (Tailwind) · TanStack Query · MSW (offline demo fallback)     |
| `apps/api`                                     | NestJS 11 · Prisma 6 + Postgres · zod validation (`nestjs-zod`) · domain events + transactional outbox |
| `apps/admin`                                   | Next.js 16 (App Router) · Tailwind 4 · Playwright                                                      |
| `packages/shared`                              | zod schemas, domain enums, plan catalog — the single API ↔ client contract                             |
| `packages/ui-tokens` / `api-client` / `config` | design tokens, typed fetch client, shared `tsconfig`                                                   |

## Structure

```
apps/
  mobile/   public site (Home, Zones, Projects, Subscription, About) + logged-in area
            (auth, dashboard, profile, admin shortcut)
  api/      modular monolith: auth, catalog, projects, subscriptions, payments,
            impact, notifications — modules only talk to each other via domain events
  admin/    login, project CRUD, progress updates with image upload
packages/
  shared/      zod schemas, enums, plans — contract for API + every client
  ui-tokens/   design tokens (color, radius, spacing) shared by mobile and admin
  api-client/  typed fetch client
  config/      shared tsconfig
docs/          ADRs, AI workflow log, local-dev guides
.claude/       rules, agents, commands, plans, roadmap — versioned on purpose (see below)
```

## What's implemented

| Area                                                                                                         | Status          | Notes                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | --------------- | --------------------------------------------------------------------------------------------------- |
| Mobile — public site (Home, Zones, Projects, Subscription, About)                                            | done            | faithful to the reference site, adapted to native patterns (carousels, safe areas, haptics)         |
| Mobile — auth, simulated payment, dashboard, profile, journey points                                         | done            | register → simulated card payment → welcome → dashboard; PAN never leaves the device                |
| Mobile — admin shortcut (publish a project update)                                                           | done            | thin native shortcut; full editing stays in the web admin                                           |
| API — auth (JWT + rotated refresh), roles, catalog, projects, subscriptions, payments, impact, notifications | done            | 8 domain events, idempotent listeners, transactional outbox + relay                                 |
| Admin — login, project list/CRUD, progress updates with image upload                                         | done            | cookie-based session, role-gated                                                                    |
| Admin — dashboard / users / subscriptions pages                                                              | **placeholder** | plan drafted (`.claude/plans/20260824-admin-metrics-users-subscriptions.plan.md`), not executed yet |
| Deploy                                                                                                       | **not done**    | app runs locally only (see [Setup](#setup)); CI runs the full suite on every push                   |

Nothing here is guessed: `docs/ai-workflow.md` has a dated log entry per session with what was asked, what was delivered, what was reviewed and what was hand-adjusted, and `.claude/roadmap/ROADMAP.md` tracks each unit of work against the commits that closed it.

## Requirements

Node 20+, pnpm 9 (`corepack enable`), Docker (local Postgres), Expo Go on your phone (or an emulator/simulator).

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env
pnpm run setup     # = install + docker postgres up + prisma migrate + seed
                    # ("run" is required — bare "pnpm setup" is a pnpm built-in)
```

Seed accounts: `admin@oneimpact.org / Admin123!` (ADMIN) and `ana@oneimpact.org / User123!` (USER).

## Run

```bash
pnpm dev:api      # http://localhost:5000  (Swagger: /docs, health: /health)
pnpm dev:admin    # http://localhost:5001
pnpm dev:mobile   # Expo dev server -> scan the QR with Expo Go
```

Mobile on a physical phone needs your computer's LAN IP in `apps/mobile/.env` (`EXPO_PUBLIC_API_URL=http://192.168.x.x:5000`). Without an API URL configured, mobile talks to an in-app MSW mock seeded with the same fixtures as the database, so the app is demoable with zero backend running. Full walkthrough, ports and troubleshooting: [`docs/local-development.md`](docs/local-development.md).

## Quality

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @oneimpact/api test:e2e      # needs `pnpm db:up`
pnpm --filter @oneimpact/admin test:e2e    # Playwright
bash scripts/dev/quality-check.sh --scope all   # what CI runs, step by step
```

## Git workflow

One feature branch per unit of work (`feat|fix|chore|docs/<area>-<slug>`), [Conventional Commits](https://www.conventionalcommits.org/) with a scope (`feat(mobile): ...`, validated by a commit-msg hook), merged into `main` with `--no-ff` so each unit stays a readable, revertable chunk of history. `main` is kept green: CI (typecheck, lint, unit, API e2e against Postgres, Playwright against the built admin) runs on every push and PR.

## AI-assisted development

This project was built with [Claude Code](https://claude.com/claude-code) as a working partner throughout, not as a one-off code generator. The repo's `.claude/` directory is versioned on purpose — it _is_ the evidence of that process: rules the agent follows per app (`.claude/rules/`), a plan → execute → verify → log workflow (`gen-plan` → `run-plan-*` → `verify` → `ai-log`), specialized sub-agents (`implementer` for one task at a time, `verifier` that only runs checks and never edits, `debugger`, a multi-agent `review` for architecture/security/UX-fidelity), and a roadmap (`.claude/roadmap/`) splitting the build into 15 dependency-tracked items run across parallel git worktrees.

`docs/ai-workflow.md` is the full, dated log — what was asked, what came back, what was reviewed, what was changed by hand and why. A few things worth pointing at directly, because they're the actual answer to "how do you review what the agent gives you":

- **A wrong plan assumption, caught by the agent itself.** A plan instructed "no active subscription → counters at 0"; the implementer followed the letter of it but flagged the contradiction against the acceptance criterion "cancel → the journey point still stands." It was right — journey points, follows and notifications are facts about the user, not the subscription — and the plan was corrected on the spot.
- **A real security invariant that slipped past a schema.** `strip()` on the incoming zod schema silently dropped a `card.number` field the client wasn't supposed to send, but the raw request body — full card number included — still reached the API and, from there, the logger. Caught by a test written to check exactly that; fixed with `.strict()` (400 instead of a silent drop).
- **A production bug an agent found by reasoning, not by a failing test.** `jwt.sign` timestamps at one-second granularity, so two refresh tokens issued for the same user within the same second came out byte-identical; on rotation, reuse detection could misread a legitimate refresh as stolen and kill the session. It had been masked in a test with `setTimeout(1100)`; the fix was a unique `jti` per token, and the sleep was removed.
- **A false negative from the verifier itself, not trusted at face value.** A verification agent reported a module as missing after accidentally checking out the wrong working tree; the count didn't match what had already been observed manually, so it was checked by hand before being believed.

That pattern — plan, delegate one task at a time, verify with real checks (not just "the agent said so"), read the diff, log the reasoning — repeats across the 16 dated entries in `docs/ai-workflow.md`. Architecture decisions with lasting consequences are written up separately as ADRs in [`docs/adr/`](docs/adr/).

## Docs

- [`docs/local-development.md`](docs/local-development.md) — full local setup, ports, troubleshooting
- [`docs/ai-workflow.md`](docs/ai-workflow.md) — dated log of every AI-assisted session
- [`docs/adr/`](docs/adr/) — architecture decision records
- [`.claude/roadmap/ROADMAP.md`](.claude/roadmap/ROADMAP.md) — the 15-item build plan and its status
