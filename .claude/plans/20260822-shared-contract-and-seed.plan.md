# Plan -- Contrato de dominio en shared + modelo Prisma + seed unico (por fases, checkpoint por fase)

> **Fecha**: 2026-08-22
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/01-shared-contract-and-seed.md` (ola 0, bloquea 02/03/05/07)
> **Base**: spec 01; vault `01-Tecnologia-Arquitectura/arquitectura-sistema.md` (Contrato API, Modelo de datos, Seed); `02-Analisis-Visual/pantallas/zonas.md` (copy de zonas y de los 5 avances); plan previo `20260822-mobile-foundation-and-home.plan.md` (no se toca lo hecho)
> **Areas**: shared, api (prisma + seed), api-client
> **Contrato shared tocado**: si -- se agregan enums (`PaymentStatus`, `JourneySource`), tipos, schemas y `seed-data`. Consumidores reales hoy (grep): solo `packages/api-client/src/index.ts:1` (`LoginInput`, `RegisterInput`). Ninguna app importa `@oneimpact/shared` todavia (solo lo declara en `package.json`), asi que el radio de impacto es minimo.
> **Schema Prisma tocado**: si -- modelo completo; migracion `domain_model`; seed reescrito sobre `@oneimpact/shared/seed-data`. MSW de mobile no existe aun (lo crea 07 consumiendo el mismo `seed-data`).
> **Eventos**: ninguno (solo se crea la tabla `OutboxEvent`)
> **Zonas de riesgo**: (1) resolucion de `@oneimpact/shared` desde Nest/ts-node (bloqueo real, ver hallazgos); (2) `simulatedCardSchema` no se toca (sin PAN); (3) `db:setup` hardcodea `migrate dev --name init` (`apps/api/package.json:26`)
> **Fase del roadmap**: Fase 1 (entrega lun 24 ago 2026), ola 0
> **Como ejecutar**: `/run-plan-autonomous` en rama `feat/shared-contract-and-seed` (modo que indica el spec) | `/run-plan-guided`

## Objetivo

Dejar fijado el contrato de dominio que consumen las tres apps: tipos, enums,
schemas zod y rutas REST en `packages/shared`; modelo Prisma completo con
enums espejo; un unico dataset semilla tipado (`seed-data.ts`) que alimenta el
seed de la API hoy y el MSW de mobile y Playwright del admin despues; y
`packages/api-client` con metodos tipados para todo el contrato.

## Contexto y hallazgos del analisis

### Bloqueo no previsto por el spec: `shared` no es consumible desde la API

Probe descartable hecho durante el analisis (archivos borrados, nada quedo):

- `tsc -p apps/api/tsconfig.json` con `import { PlanId } from '@oneimpact/shared'`
  falla: `TS2835 Relative import paths need explicit file extensions` en
  `packages/shared/src/index.ts:1-4`, porque la API compila con
  `module: nodenext` (`apps/api/tsconfig.json:3`) y `shared` expone `.ts` crudo
  con `"type": "module"` y `"exports": { ".": "./src/index.ts" }`
  (`packages/shared/package.json:4-9`).
- `ts-node prisma/__probe.ts` importando shared falla con `ERR_REQUIRE_ESM`:
  el seed (`apps/api/package.json:94`, `ts-node prisma/seed.ts`) tampoco puede
  consumirlo.
- `turbo.json:7-9` ya declara `typecheck/test/lint dependsOn ["^build"]`: el
  scaffold preveia que los packages se **construyan**. Hoy ningun package tiene
  script `build`.

Decision tomada (no bloqueante, la mas simple y dentro de lo que turbo ya
espera): `packages/shared` compila a `dist/` en **CommonJS + d.ts** con `tsc`
(sin dependencias nuevas), `exports` apunta a `dist`, se quita
`"type": "module"`. Nest (CJS), ts-node (seed), Metro (`unstable_enablePackageExports`
activo por defecto en SDK 57, `node_modules/metro-config/src/defaults/index.js:69`)
y Next (`moduleResolution: bundler`) resuelven CJS sin problema. Vitest sigue
corriendo sobre `src`. `packages/api-client` queda como fuente TS (solo lo
consumen bundlers), pero su `typecheck` pasa a depender del build de shared
(turbo ya lo encadena).

Alternativa descartada: cambiar la API a `module: commonjs` + `paths` hacia
`packages/shared/src`: rompe `rootDir` de Nest (dist anidado), obliga a
`tsconfig-paths` en ts-node y `moduleNameMapper` en dos configs de jest.

### Estado del codigo

- `packages/shared/src/enums.ts:1-14`: `Role`, `PlanId` (`basico|estandar|premium`),
  `Billing` (`monthly|annual`), `ProjectStatus`, `SubscriptionStatus`. Faltan
  `PaymentStatus` y `JourneySource` que el modelo del vault necesita.
- `packages/shared/src/plans.ts:1-20`: `Plan` + `PLANS` + `monthlyPriceFor`. Se
  mantiene el archivo (lo consume 04) y se re-exporta desde `types/catalog.ts`.
- `packages/shared/src/schemas/{auth,payment}.ts`: existen. `payment.test.ts`
  es el unico test (Vitest).
- `apps/api/prisma/schema.prisma:1-24`: solo `Role` y `User`. Migracion
  `20260822145426_init` aplicada. `seed.ts:1-31` crea 2 usuarios con argon2.
- `packages/api-client/src/index.ts:1-50`: wrapper `request<T>` con token y
  `ApiError`; metodos `health`, `auth.register/login`, `plans.list`,
  `zones.list`, `projects.list` sin tipar.
- `apps/api/src/modules/*` son carpetas vacias salvo `health`. Nada importa
  shared ni Prisma fuera de `infra/prisma`.

### Discrepancias vault vs codigo (gana el codigo, se anota)

- Vault `arquitectura-sistema.md` escribe `billing: MONTHLY|ANNUAL` y
  `Plan.id: basico|estandar|premium`; el codigo ya tiene `Billing` en minuscula
  (`'monthly'|'annual'`). **Prisma espeja exactamente los valores de shared**
  (enum `Billing { monthly annual }`, enum `PlanId { basico estandar premium }`):
  la invariante es "identicos", no "mayusculas".
- El modelo del vault no da clave natural a `Project` ni `ProjectUpdate`. Para
  un seed idempotente se agrega `Project.slug @unique` y `seed-data` trae `id`
  estables para los updates (`upsert` por id). Se anota en el vault al cerrar.
- El vault dice `imageUrl`/`coverUrl`; las imagenes viven como assets locales
  de mobile (`apps/mobile/src/assets/images/zones/*.jpg`, `advances/*.jpg`).
  Decision: `seed-data` guarda **claves de asset relativas** (`zones/amazonia.jpg`,
  `advances/guainia.jpg`); mobile mapea clave -> `require()` en 03/07 y el admin
  las mostrara cuando haya Storage (11). No se inventan URLs.

### Datos semilla (fuente: `pantallas/zonas.md`)

- Zonas (5, `order` 1..5): amazonia, mexico, africa (copy de la web) + borneo,
  patagonia (descripciones propuestas en el spec de Zonas, seccion 2).
- Proyectos (5) = los "avances desde el territorio", cada uno con su primer
  `ProjectUpdate` (titulo, desc y asset del avance, `publishedAt` 2026):
  guainia -> zona amazonia; yucatan -> mexico; corredores (savana oriental) ->
  africa; borneo-monitoreo -> borneo; amazonia-carbono -> amazonia (mapeo
  definido en `zonas.md`, seccion "Detalle de zona").
- Planes: los 3 de `plans.ts` (misma fuente).
- Usuarios: `admin@oneimpact.org / Admin123!` (ADMIN) y `ana@oneimpact.org /
User123!` (USER), definidos solo en `seed.ts` (sin passwords en shared).

## Decisiones pendientes (bloqueantes)

(ninguna). Decisiones tomadas por defecto, cambiables sin rehacer el plan:

1. `shared` se construye a `dist` CJS (ver hallazgos). Si se prefiere `tsup`
   dual ESM/CJS, es un cambio acotado a la fase 1.
2. Valores no especificados por el vault para `Project`: `status = ACTIVE`,
   `progress` propuesto (guainia 64, yucatan 25, corredores 40, borneo 80,
   amazonia-carbono 100 -> `COMPLETED`), `targetDate` 2026-12-31 salvo el
   completado, `lat/lng` aproximados del territorio, `summary` = primera frase
   del desc del avance. Quedan en `seed-data.ts` con comentario `// proposed`.
3. `Plan` se persiste en Prisma como tabla (con `id` enum `PlanId`) para que
   `Subscription.planId` tenga FK; `GET /plans` (02) puede seguir sirviendo
   `PLANS` de shared o leer la tabla: misma data.

## Principios

Aditivo; verde por fase; schemas y enums una sola vez en shared (Prisma los
espeja en el mismo commit); `seed-data.ts` es la unica fuente de datos demo;
sin PAN en ningun schema; sin supresiones; identificadores en ingles, copy en
espanol; sin emojis.

## Mapa de fases

| Fase | Nombre                                                 | Area       | Impacto                               | Shared           | Prisma | Commit sugerido                                                        |
| ---- | ------------------------------------------------------ | ---------- | ------------------------------------- | ---------------- | ------ | ---------------------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                              | --         | Ninguno                               | No               | No     | _(sin commit)_                                                         |
| 1    | `shared` construible y consumible desde la API         | shared     | Config (package.json, tsconfig.build) | Si (empaquetado) | No     | `chore(shared): build to dist so api and ts-node can consume it`       |
| 2    | Contrato de dominio en shared                          | shared     | Aditivo                               | Si               | No     | `feat(shared): domain types, project schemas, api paths and seed data` |
| 3    | Modelo Prisma completo + migracion + seed desde shared | api        | Aditivo (schema)                      | No               | Si     | `feat(api): full prisma domain model and seed from shared`             |
| 4    | api-client tipado para todo el contrato                | api-client | Aditivo                               | No               | No     | `feat(api-client): typed methods for the full rest contract`           |
| 5    | Cierre: bateria completa + ai-log                      | --         | Ninguno                               | No               | No     | `docs: log ai session shared-contract-and-seed`                        |

---

## Fase 0 -- Pre-flight

**Objetivo**: confirmar el estado que el plan asume.
**Acciones**:

1. `git branch --show-current` = `feat/shared-contract-and-seed`; `git status --short` limpio.
2. `docker compose ps` muestra `db` corriendo (`pnpm db:up` si no).
3. `bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit` y `--scope api --only typecheck` en verde.
4. Confirmar que nadie importa `@oneimpact/shared` fuera de `packages/api-client/src/index.ts` (`grep -rn "@oneimpact/shared" apps packages --include=*.ts --include=*.tsx`).

CHECKPOINT -- sin commit.

## Fase 1 -- `shared` construible y consumible desde la API

**Objetivo**: que `import ... from '@oneimpact/shared'` compile en la API (`tsc` nodenext), corra en `ts-node` (seed) y siga resolviendo en Metro/Next.
**Area**: shared (+ `apps/api` solo para el probe)
**Archivos**: `packages/shared/package.json:4-15`, `packages/shared/tsconfig.json` (nuevo `tsconfig.build.json`), `packages/shared/.gitignore` (`dist`), `.gitignore` raiz si no cubre `packages/*/dist`
**Shared**: cambia el empaquetado, no el API publico. Consumidor afectado: `packages/api-client` (resuelve `dist` via turbo `^build`).
**Acciones** (los cambios a `package.json` los hace el orquestador, no el implementer):

1. `packages/shared/tsconfig.build.json`: extiende el actual, `module: commonjs`, `moduleResolution: node10`, `declaration: true`, `outDir: dist`, `noEmit: false`, `exclude: ["src/**/*.test.ts"]`.
2. `packages/shared/package.json`: quitar `"type": "module"`; `main: ./dist/index.js`, `types: ./dist/index.d.ts`, `exports: { ".": { types, default }, "./seed-data": { types: ./dist/seed-data.d.ts, default: ./dist/seed-data.js } }`; scripts `build: tsc -p tsconfig.build.json`, `clean`; `files: ["dist"]`. (El subpath `./seed-data` se crea en fase 2; declararlo ya no rompe nada.)
3. Verificar que `pnpm --filter @oneimpact/shared build` genera `dist/index.js` + `.d.ts` y que `dist` esta ignorado por git.
4. Probe descartable en la API (no se commitea): `apps/api/src/__probe.ts` con `import { PlanId } from '@oneimpact/shared'` -> `pnpm --filter @oneimpact/api typecheck` verde; `npx ts-node prisma/__probe.ts` imprime `PLANS.length`. Borrar ambos.
5. `pnpm typecheck` desde la raiz (turbo construye shared antes de api-client/admin/mobile).

**Verificacion**:

- `pnpm --filter @oneimpact/shared build && bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit`
- `pnpm typecheck` raiz (todos los workspaces, confirma que turbo encadena `^build`)
- Probe de la API descrito en la accion 4 (ambos verdes)

**Riesgos**: Metro con `exports`: nada en mobile importa shared todavia, asi que el bundle no lo prueba; 03/07 lo verifican con `--only bundle`. CI (14) debe correr `turbo build` de packages antes de typecheck (turbo ya lo hace con `^build`).

CHECKPOINT. **Commit sugerido**: `chore(shared): build to dist so api and ts-node can consume it`

## Fase 2 -- Contrato de dominio en shared

**Objetivo**: tipos, enums, schemas, rutas y datos semilla tipados, con tests.
**Area**: shared
**Archivos**: `packages/shared/src/enums.ts`, `src/types/{catalog,auth,subscription}.ts`, `src/schemas/{projects,catalog}.ts`, `src/schemas/projects.test.ts`, `src/api-paths.ts`, `src/seed-data.ts`, `src/seed-data.test.ts`, `src/index.ts`
**Spec**: vault `arquitectura-sistema.md` secciones "Contrato API" y "Modelo de datos"; `pantallas/zonas.md` secciones 2 y 3 (copy)
**Shared**: aditivo. Consumidor existente (`api-client`) no cambia de shape.
**Acciones** (una invocacion del implementer por item):

1. `enums.ts`: agregar `PaymentStatus { SUCCEEDED, FAILED }`, `JourneySource { SUBSCRIPTION, FOLLOW, EVENT }`, `NotificationType { WELCOME, PROJECT_UPDATE, SUBSCRIPTION }` con el mismo patron `as const`; exportar `ENUM_VALUES = { Role: [...], PlanId: [...], ... }` (lo compara `enums.spec.ts` de 02 contra Prisma).
2. `types/catalog.ts` (`Zone { id, slug, name, description, imageKey, order }`, re-export de `Plan`, `Project { id, slug, zoneId, title, summary, description, status, progress, targetDate, lat, lng, coverKey, createdAt }`, `ProjectUpdate { id, projectId, title, body, progress, mediaKey?, publishedAt, authorId? }`, `ProjectWithUpdates`), `types/auth.ts` (`AuthTokens { accessToken, refreshToken }`, `UserProfile { id, email, name, role }`, `AuthResponse { user, tokens }`), `types/subscription.ts` (`Subscription`, `Payment` -- solo `cardBrand`, `cardLast4`, jamas PAN --, `DashboardSummary { plan, billing, activeMonths, followedProjects, latestUpdate? }`, `Notification`). Fechas como ISO `string` en el contrato.
3. `schemas/projects.ts`: `createProjectSchema` (title 3-120, summary <=200, description, zoneId/zoneSlug, status enum, progress int 0-100 default 0, targetDate ISO opcional, lat/lng opcionales, coverKey opcional), `updateProjectSchema = createProjectSchema.partial()`, `publishUpdateSchema` (title 3-120, body min 10, progress int 0-100, mediaUrl url opcional). `schemas/catalog.ts`: `zoneSlugSchema` (`/^[a-z0-9-]+$/`). Mensajes de error en espanol.
4. `api-paths.ts`: `API_PATHS` con funciones para rutas con parametro (`projects.byId(id)`, `zones.bySlug(slug)`, `projects.updates(id)`, `projects.follow(id)`), y `auth.register/login/refresh`, `me`, `plans`, `zones`, `projects`, `subscriptions`, `subscriptionsMe`, `dashboardMe`, `notificationsMe`, `admin.metrics/users/userRole(id)`. Prefijo `/v1`.
5. `seed-data.ts`: `SEED_ZONES` (5), `SEED_PLANS = PLANS`, `SEED_PROJECTS` (5, con `zoneSlug`, `slug`, `updates: [{ id, title, body, progress, mediaKey, publishedAt }]`), tipados con los tipos de `types/` menos los campos que pone la DB (`id` de zona/proyecto, `createdAt`). Copy exacto de `zonas.md`. Sin usuarios ni passwords.
6. Tests Vitest: `projects.test.ts` (progress 101 y -1 rechazados, body vacio rechazado, update valido pasa, `partial` acepta `{}`), `seed-data.test.ts` (5 zonas con slugs unicos, 5 proyectos cuyo `zoneSlug` existe, cada proyecto con exactamente 1 update, `ENUM_VALUES` cubre todos los enums exportados).
7. `index.ts` re-exporta todo; `pnpm --filter @oneimpact/shared build` regenera `dist` (incluye `dist/seed-data.js` para el subpath).

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit`
- `pnpm --filter @oneimpact/api-client typecheck` (consumidor existente sigue verde)
- Invariante: `grep -n "pan\|number" packages/shared/src/schemas/*.ts` no muestra ningun campo de tarjeta nuevo.

**Riesgos**: zod 4 (`packages/shared/package.json:23`): usar `z.string().url()`/`.email()` segun API v4; no copiar sintaxis de v3 de memoria.

CHECKPOINT. **Commit sugerido**: `feat(shared): domain types, project schemas, api paths and seed data`

## Fase 3 -- Modelo Prisma completo + migracion + seed desde shared

**Objetivo**: schema completo con enums espejo, migracion `domain_model`, seed idempotente que consume `@oneimpact/shared/seed-data` y deja 5 zonas, 5 proyectos, 5 updates, 3 planes, 2 usuarios.
**Area**: api
**Archivos**: `apps/api/prisma/schema.prisma:12-24`, `apps/api/prisma/seed.ts:1-31`, `apps/api/prisma/migrations/<ts>_domain_model/` (generada, no editada)
**Prisma**: migracion `domain_model`; seed reescrito; MSW: no existe aun (07 consume `seed-data`).
**Acciones**:

1. (implementer) `schema.prisma`: enums `Role`, `PlanId { basico estandar premium }`, `Billing { monthly annual }`, `SubscriptionStatus`, `PaymentStatus`, `ProjectStatus`, `JourneySource`, `NotificationType` identicos a `ENUM_VALUES`. Modelos: `User` (+ `onboardingCompleted Boolean @default(false)`, relaciones), `Plan` (`id PlanId @id`, `name`, `monthlyPrice Int`, `annualMonthlyPrice Int`, `annualTotal Int`, `recommended Boolean`), `Subscription` (`userId`, `planId PlanId`, `billing`, `status`, `startedAt`, `canceledAt?`; index `userId`), `Payment` (`subscriptionId`, `amount Int` en centavos, `currency` default `USD`, `status`, `cardBrand`, `cardLast4 @db.VarChar(4)`, `simulated Boolean @default(true)`), `Zone` (`slug @unique`, `name`, `description`, `imageKey`, `order`), `Project` (`slug @unique`, `zoneId`, `title`, `summary`, `description`, `status`, `progress Int @default(0)`, `targetDate?`, `lat/lng Float?`, `coverKey?`, `createdById?`), `ProjectUpdate` (`projectId`, `title`, `body`, `progress`, `mediaKey?`, `publishedAt`, `authorId?`), `ProjectFollow` (`@@id([userId, projectId])`), `JourneyPoint` (`userId`, `month String` `YYYY-MM`, `source`, `refId?`, `@@unique([userId, month, source])`), `Notification` (`userId`, `type`, `title`, `body`, `refId?`, `readAt?`, `@@unique([userId, type, refId])`), `OutboxEvent` (`type`, `payload Json`, `createdAt`, `processedAt?`, `attempts Int @default(0)`; index `processedAt`). Claves naturales de los listeners idempotentes (regla 30) quedan como `@@unique` desde ahora.
2. (orquestador) `pnpm --filter @oneimpact/api exec prisma migrate dev --name domain_model` y `prisma generate`.
3. (implementer) `seed.ts`: importa `SEED_ZONES`, `SEED_PLANS`, `SEED_PROJECTS` de `@oneimpact/shared/seed-data`; `upsert` de planes por `id`, zonas por `slug`, proyectos por `slug` (resolviendo `zoneId` por slug), updates por `id` estable, usuarios por `email` (passwords con argon2 como hoy, `authorId` del update = admin). `update: {}` solo en usuarios (no pisar passwords); en catalogo `update` con los mismos datos para que el seed corrija copy. Log final con conteos.
4. (implementer) test minimo de shape `apps/api/test/seed.e2e-spec.ts`: tras `prisma db seed`, cuenta `zone=5, project=5, projectUpdate=5, plan=3, user=2` y que correr el seed **dos veces** no duplica (idempotencia). Se ejecuta con `test:e2e` (Postgres arriba).

**Verificacion**:

- `pnpm --filter @oneimpact/api prisma:seed` dos veces seguidas, sin error.
- `bash scripts/dev/quality-check.sh --scope api --only typecheck,unit,e2e` (e2e incluye `/health` y el nuevo `seed.e2e-spec.ts`).
- `pnpm db:setup` desde cero (`docker compose down -v && pnpm db:up && pnpm db:setup`) deja los conteos del criterio de aceptacion. Nota: `db:setup` corre `migrate dev --name init` (`apps/api/package.json:26`); con migraciones ya existentes y schema sin drift no crea nada nuevo. Si Prisma detecta drift, STOP y reportar (no editar migraciones a mano).
- Pendiente manual: `prisma studio` muestra relaciones Project->Zone, ProjectUpdate->Project.

**Riesgos**: `prisma migrate dev` puede pedir reset si la DB local tiene drift: aceptar solo en local (`docker compose down -v`), nunca contra Supabase. `seed.ts` con import de subpath: ts-node resuelve `exports` CJS de `dist` (verificado en fase 1). `tsconfig.build.json` de la API ya excluye `prisma` (leccion 2026-08-22).

CHECKPOINT. **Commit sugerido**: `feat(api): full prisma domain model and seed from shared`

## Fase 4 -- api-client tipado para todo el contrato

**Objetivo**: metodos tipados sobre `API_PATHS` y los tipos de shared, aunque la API aun no responda.
**Area**: api-client
**Archivos**: `packages/api-client/src/index.ts:36-48` (objeto de metodos), nuevos `src/resources/{auth,catalog,projects,subscriptions,me}.ts` si el archivo pasa de 300 lineas, `src/index.test.ts`
**Shared**: consume tipos y `API_PATHS`; no cambia shared.
**Acciones**:

1. Extender `createApiClient` con: `plans.list(): Plan[]`, `zones.list(): { items: Zone[]; total }`, `zones.get(slug): Zone & { projects: Project[] }`, `projects.list({ zoneSlug? })`, `projects.get(id): ProjectWithUpdates`, `projects.create(CreateProjectInput)`, `projects.update(id, UpdateProjectInput)`, `projects.publishUpdate(id, PublishUpdateInput)`, `projects.follow/unfollow(id)`, `auth.register/login -> AuthResponse`, `auth.refresh({ refreshToken }) -> AuthTokens`, `me.get(): UserProfile`, `subscriptions.create(CreateSubscriptionInput): Subscription`, `subscriptions.me()`, `subscriptions.cancel()`, `dashboard.me(): DashboardSummary`, `notifications.me(): { items: Notification[]; total }`, `admin.metrics()`, `admin.users()`, `admin.setRole(id, role)`. Listas con `{ items, total }` (regla 30). Todas las rutas desde `API_PATHS`, sin strings sueltos.
2. Test Vitest con `fetch` mockeado (`vi.stubGlobal`): `projects.publishUpdate` hace `POST` a `/v1/projects/:id/updates` con body JSON y `Authorization: Bearer`; un 401 lanza `ApiError` con `status` 401; `subscriptions.create` serializa solo `{brand,last4,holder,expMonth,expYear}` (asercion explicita de que no hay campo `number`).

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit` (el scope `shared` del script cubre shared, ui-tokens y api-client: `scripts/dev/quality-check.sh:49`)
- `pnpm --filter @oneimpact/admin typecheck` y `pnpm --filter @oneimpact/mobile typecheck` (consumidores declarados; hoy no importan nada, debe seguir verde)

**Riesgos**: ninguno de contrato; la API real (02/05/06) debe cumplir estas firmas -- el plan de 02 las toma como entrada.

CHECKPOINT. **Commit sugerido**: `feat(api-client): typed methods for the full rest contract`

## Fase 5 -- Cierre

**Objetivo**: bateria completa y registro de la sesion.
**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` (Postgres arriba). Nota conocida: `apps/api lint` esta rojo desde el scaffold (`02d45d4`, 4 errores prettier + 1 `no-unsafe-member-access` en `test/app.e2e-spec.ts:27`); si sigue rojo y es lo unico, se reporta como preexistente y **no** bloquea este plan, salvo que el usuario pida arreglarlo en un `chore(api)` aparte.
2. Anotar en el vault (`arquitectura-sistema.md`, Modelo de datos) las discrepancias resueltas: enums en minuscula, `Project.slug`, claves de asset en vez de URLs.
3. `/ai-log` -> `docs: log ai session shared-contract-and-seed`.

**Verificacion**: `--scope all` con conteos; `git log --oneline main..HEAD` con 4 commits de codigo + 1 de docs.

CHECKPOINT final. La rama queda lista; push y PR son del usuario.
