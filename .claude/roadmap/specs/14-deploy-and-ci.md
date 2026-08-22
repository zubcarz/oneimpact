# Spec 14 -- deploy-and-ci

**Track**: infra · **Depende de**: 02, 05 (API con algo que servir); idealmente 06 · **Ola**: 4 (paralelo con 09)
**Rama**: `feat/deploy-and-ci` · **Modo**: `/run-plan-guided` (requiere cuentas y secretos del usuario en cada paso)

## Objetivo

API publica en internet con Postgres en Supabase, admin en Vercel, CI completo
y despliegue automatico desde `main`. Que la demo del GIF y el evaluador puedan
apuntar `EXPO_PUBLIC_API_URL` a una URL real.

## Referencia del vault
`arquitectura-sistema.md` (Infraestructura, CI/CD), `docs/local-development.md`.

## Alcance

### Supabase (manual del usuario, guiado)
- Proyecto free; obtener `DATABASE_URL` (pooler 6543, `?pgbouncer=true`) y `DIRECT_URL` (5432). Bucket `project-media` publico-lectura.
- Desde local: `DIRECT_URL=... pnpm --filter @oneimpact/api exec prisma migrate deploy` + seed.

### API hosting
- Decision en el plan: **DigitalOcean App Platform** (si hay credito) o **Render** free (fallback). Ambos desde `apps/api/Dockerfile` (ya existe; validar build multi-stage y `pnpm deploy --filter` para imagen liviana).
- Env: `DATABASE_URL`, `DIRECT_URL`, `JWT_*`, `CORS_ORIGINS` (Vercel + `exp://`), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PORT`.
- `/health` como health check del servicio.

### Admin en Vercel
- Import del repo, root `apps/admin`, build `pnpm --filter @oneimpact/admin build`, env `NEXT_PUBLIC_API_URL`/`API_URL`. Preview por PR.

### GitHub Actions
- `ci.yml` ya corre `quality-check --only typecheck,lint,unit` + `api-e2e`. Agregar `mobile-bundle` (`expo export`) como job separado y `admin-e2e` si 11 no lo hizo.
- `deploy-api.yml`: en push a `main` con cambios en `apps/api|packages/shared|packages/config` -> build imagen -> push (DOCR o Render deploy hook) -> `prisma migrate deploy` post-deploy.
- `keepalive.yml`: cron lunes 06:00 UTC -> `GET /health` + query trivial a Supabase (evita pausa del free tier).
- Secrets documentados en `docs/deploy.md` (nombres, no valores).

### Mobile
- `apps/mobile/.env.example` con la URL publica comentada. `eas.json` minimo (profile `preview` Android APK) -- opcional, sin build en este spec.

## Fuera de alcance
EAS Build real, Sentry, dominios propios.

## Criterios de aceptacion
- `https://<api>/health` -> `database: up`. `https://<admin>.vercel.app/login` funciona contra esa API.
- Push a `main` dispara deploy de API y Vercel; CI verde con 3-4 jobs.
- Expo Go con `EXPO_PUBLIC_API_URL=https://<api>` navega Zonas y Proyectos con datos reales.

## Verificacion
Manual + `curl` de los endpoints publicos; `gh run list` verde.

## Commits sugeridos
`ci: mobile bundle job and deploy-api workflow` · `chore(api): production dockerfile and env docs` · `docs: deploy guide`
