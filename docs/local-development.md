# Local development

> Snapshot of what already runs today, plus the known issues of this machine:
> [local-run-status.md](local-run-status.md).

Everything runs on your machine: Postgres in Docker, API + admin as Node processes, mobile through Expo Go on a physical phone (or an emulator).

```
┌─────────────┐  LAN (192.168.x.x:5000)  ┌──────────────┐      ┌──────────────────┐
│ Expo Go     │ ───────────────────────▶ │ API :5000    │ ───▶ │ Postgres :5432   │
│ (phone)     │                          │ NestJS       │      │ docker compose   │
└─────────────┘                          └──────────────┘      └──────────────────┘
┌─────────────┐  localhost:5000                  ▲
│ Admin :5001 │ ─────────────────────────────────┘
│ Next.js     │
└─────────────┘
```

## 0. Prerequisites
- Node 20+ and `corepack enable` (pnpm 9.15 is pinned in `package.json`)
- Docker Desktop running
- Expo Go on your phone, same Wi‑Fi as the computer
- Windows: allow Node through the firewall the first time Metro/API ask for it

## 1. One-shot setup
```bash
pnpm run setup    # ("run" is required: bare "pnpm setup" is a pnpm built-in) pnpm install + docker compose up -d + prisma migrate + seed
```
Or step by step:
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm db:up        # Postgres 16 on localhost:5432 (user/pass: postgres/postgres, db: oneimpact)
pnpm db:setup     # prisma migrate dev + seed
```
Seed users: `admin@oneimpact.org / Admin123!` (ADMIN) and `ana@oneimpact.org / User123!` (USER).

## 2. Run
| Command | What | URL |
|---|---|---|
| `pnpm dev:api` | NestJS with watch | http://localhost:5000/health · http://localhost:5000/docs |
| `pnpm dev:admin` | Next.js | http://localhost:5001 |
| `pnpm dev:all` | API + admin via Turbo in one terminal | |
| `pnpm dev:mobile` | Expo dev server (Metro :8081) → scan QR with Expo Go | |

### Mobile ↔ API on a physical phone
`localhost` on the phone is the phone. Set your computer's LAN IP in `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.0.3:5000
```
(`ipconfig` → IPv4 of your Wi‑Fi adapter). Add that origin to `CORS_ORIGINS` in `apps/api/.env` if you call the API from Expo web. Restart Metro after changing `.env` (`EXPO_PUBLIC_*` are inlined at bundle time).

Emulators: Android emulator reaches the host at `http://10.0.2.2:5000`; iOS simulator can use `http://localhost:5000`.

If the phone cannot connect to Metro (corporate Wi‑Fi / AP isolation), run `npx expo start --tunnel` inside `apps/mobile`.

## 3. Database workflow
```bash
pnpm --filter @oneimpact/api prisma:migrate     # create a migration after editing schema.prisma
pnpm --filter @oneimpact/api prisma:seed        # re-run seed (idempotent upserts)
pnpm --filter @oneimpact/api exec prisma studio # GUI on http://localhost:5555
pnpm db:down                                    # stop Postgres (data persists in the pgdata volume)
docker compose down -v                          # wipe data
```
Prisma reads `DATABASE_URL` (runtime) and `DIRECT_URL` (migrations). Locally both point to Docker; on Supabase, `DATABASE_URL` uses the pooler (6543) and `DIRECT_URL` the direct port (5432).

## 4. Verify
```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @oneimpact/api test:e2e          # needs Postgres up
pnpm --filter @oneimpact/admin test:e2e        # Playwright, starts Next on 5001 automatically
```

## 5. Ports
| Service | Port |
|---|---|
| API | 5000 |
| Admin | 5001 |
| Metro (Expo) | 8081 |
| Postgres | 5432 |
| Prisma Studio | 5555 |

## Troubleshooting
- **`database: "down"` in /health** → `pnpm db:up`, check `docker compose ps`.
- **Metro "Unable to resolve module"** → `pnpm install` at the root (hoisted `node_modules`), then `npx expo start -c`.
- **Jest `clearMocksOnScope is not a function`** → mismatched Jest versions; both api and mobile are pinned to Jest 29.
- **Windows CRLF warnings from git** → harmless; `.gitattributes` normalizes to LF.
