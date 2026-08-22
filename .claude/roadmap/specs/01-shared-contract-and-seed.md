# Spec 01 -- shared-contract-and-seed

**Track**: shared + api (schema Prisma + seed) · **Depende de**: nada · **Ola**: 0 (solo, bloquea todo)
**Rama**: `feat/shared-contract-and-seed` · **Modo**: `/run-plan-autonomous` (rapido, sin gates)

## Objetivo

Fijar el **contrato de dominio** que las tres apps van a consumir: tipos y
schemas en `packages/shared`, modelos Prisma completos y un **seed unico** con
los datos reales de la web (5 zonas, 5 proyectos con su primer avance, 3
planes, 2 usuarios). A partir de aqui, API, MSW de mobile y Playwright del
admin usan exactamente los mismos datos.

## Alcance

### packages/shared
- `src/types/catalog.ts`: `Zone`, `Plan` (ya existe en `plans.ts`; mover/exportar), `Project`, `ProjectUpdate`, `ProjectWithUpdates`.
- `src/types/auth.ts`: `AuthTokens`, `UserProfile` (`id,email,name,role`).
- `src/types/subscription.ts`: `Subscription`, `Payment`, `DashboardSummary`.
- `src/schemas/projects.ts`: `createProjectSchema`, `updateProjectSchema`, `publishUpdateSchema` (titulo, body, progress 0-100, mediaUrl opcional).
- `src/schemas/catalog.ts`: `zoneSlugSchema`.
- `src/api-paths.ts`: constantes de rutas REST (`/v1/plans`, `/v1/zones`, `/v1/projects`, `/v1/auth/*`, `/v1/subscriptions`, `/v1/me`, `/v1/dashboard/me`) para que api-client y MSW no dupliquen strings.
- `src/seed-data.ts`: **datos semilla tipados** (zonas con copy del vault `pantallas/zonas.md`, proyectos derivados de los 5 "avances", planes). Sin passwords: los usuarios semilla los define la API.
- Tests Vitest: schemas de projects (progress fuera de rango, body vacio).

### apps/api/prisma
- `schema.prisma` completo segun vault `arquitectura-sistema.md` (User, Plan, Subscription, Payment, Zone, Project, ProjectUpdate, ProjectFollow, JourneyPoint, Notification, OutboxEvent) con enums espejo de `shared`.
- Migracion `domain_model`.
- `seed.ts` consume `@oneimpact/shared/seed-data` + crea `admin@oneimpact.org / Admin123!` (ADMIN) y `ana@oneimpact.org / User123!` (USER). Idempotente (upsert por slug/email/id).

### packages/api-client
- Metodos tipados para todo el contrato (aunque la API aun no responda): `plans.list`, `zones.list/get`, `projects.list/get/create/update/publishUpdate/follow/unfollow`, `auth.register/login/refresh`, `me.get`, `subscriptions.create/me/cancel`, `dashboard.me`, `notifications.me`.

## Fuera de alcance
Controladores de la API, pantallas, MSW (los consume 07).

## Contrato / invariantes
- Enums en `shared` y Prisma identicos. Un test en `shared` exporta la lista y la API la compara (`enums.spec.ts` en 02).
- `seed-data.ts` es la **unica** fuente de datos demo. Nadie inventa proyectos en otro lado.
- Ningun schema acepta PAN (`simulatedCardSchema` ya existe; no se toca).

## Criterios de aceptacion
- `pnpm db:setup` desde cero deja 5 zonas, 5 proyectos, 5 updates, 3 planes, 2 usuarios.
- `quality-check.sh --scope shared --only typecheck,unit` verde; `--scope api --only typecheck` verde.
- `prisma studio` muestra las relaciones correctas (verificacion manual).

## Verificacion
```
bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit
pnpm --filter @oneimpact/api exec prisma migrate dev --name domain_model
pnpm --filter @oneimpact/api prisma:seed
bash scripts/dev/quality-check.sh --scope api --only typecheck
```

## Commits sugeridos
`feat(shared): domain types, project schemas, api paths and seed data` ·
`feat(api): full prisma domain model and seed from shared` ·
`feat(api-client): typed methods for the full rest contract`
