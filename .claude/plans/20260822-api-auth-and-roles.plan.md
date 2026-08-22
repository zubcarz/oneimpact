# Plan -- Auth JWT y roles en la API (por fases, checkpoint por fase)

> **Fecha**: 2026-08-22
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/05-api-auth-and-roles.md` (ola 2, en paralelo con 07)
> **Base**: spec 05; vault `01-Tecnologia-Arquitectura/backend-nest.md` (Seguridad, tabla de eventos), `arquitectura-sistema.md` (Autenticacion y roles, Contrato API); regla `.claude/rules/30-api-event-driven.md`; planes previos `20260822-shared-contract-and-seed.plan.md` (contrato y modelo) y `20260822-api-catalog-and-projects.plan.md` (patron de modulo, infra comun, e2e)
> **Areas**: api, shared (aditivo: schemas y rutas de auth), api-client (dos metodos que faltan)
> **Contrato shared tocado**: si -- se agregan `userProfileSchema`, `authTokensSchema`, `authResponseSchema`, `refreshTokenSchema`, `updateProfileSchema`, `updateUserRoleSchema` y `API_PATHS.auth.logout`. Consumidores verificados con grep: `packages/api-client/src/resources/{auth,me,admin}.ts`, `apps/api/**` (13 archivos), `apps/mobile/src/data/zones.ts`. Ninguno se rompe: todo es aditivo y los tipos existentes conservan su forma.
> **Schema Prisma tocado**: si -- **solo** el modelo nuevo `RefreshToken`; migracion `refresh_tokens`. **`onboardingCompleted` ya existe** (`apps/api/prisma/schema.prisma:63`), el spec se equivoca al llamarlo campo nuevo. Seed sin cambios. MSW no existe todavia (lo crea 07).
> **Eventos**: **emite** `user.registered` (auth). **Escucha** `subscription.activated` (users -> `onboardingCompleted`). El emisor de `subscription.activated` llega en el item 06: el listener queda escrito y testeado, sin emisor real todavia.
> **Zonas de riesgo**: **auth y roles** (la zona de riesgo por excelencia). Casos negativos obligatorios: 401 sin token, 401 con token expirado, 401 refresh reusado, 403 rol insuficiente, 400 al intentar editarse el rol. Ningun log con password, token ni hash.
> **Fase del roadmap**: Fase 1 (entrega lun 24 ago 2026), ola 2
> **Como ejecutar**: `/run-plan-worktree api-auth-and-roles` (rama `feat/api-auth-and-roles`, modo que indica el spec) | `/run-plan-guided`

## Objetivo

Invertir el default de la API: **todo endpoint pasa a ser privado** y se abre
explicitamente con `@Public()`. Registro y login con argon2, access token de 15
minutos, refresh de 30 dias rotado y guardado hasheado, `RolesGuard` para las
rutas de admin, y el modulo `users` con el perfil propio y la gestion de roles.

## Contexto y hallazgos del analisis

### Lo que ya existe y este plan reutiliza (item 02)

- `src/common/decorators/public.decorator.ts:3` exporta `IS_PUBLIC_KEY` y
  `@Public()`, con un docblock que dice explicitamente que hoy es **inerte** y
  que lo va a leer el `JwtAuthGuard` de este item. Nada que crear ahi.
- `src/common/errors/domain-error.ts:9` (`DomainError` con `code`/`status` y la
  factory `notFound`) y `src/common/filters/domain-error.filter.ts`. Los use
  cases de auth deben lanzar `DomainError`, nunca `HttpException`.
- `src/common/pipes/zod-validation.pipe.ts` (`nestjs-zod`) global desde
  `main.ts:19`. Los DTO se hacen con `createZodDto(<schema de shared>)`.
- `src/infra/events/` con `EventBus.publish(event, tx?)` y `EventName`
  (`event-names.ts:11`, ya incluye `USER_REGISTERED` y `SUBSCRIPTION_ACTIVATED`).
  Hoy `publish` hace `emitAsync` directo; el outbox llega en el item 12 sin
  cambiar la firma.
- Patron de modulo a copiar: `src/modules/catalog/` (controller fino ->
  `application/` -> `infrastructure/`) y su `catalog.module.ts:16-19`.
- e2e: `test/utils/create-test-app.ts` y `test/utils/seed-once.ts`;
  `jest-e2e.json` con `maxWorkers: 1` (los specs comparten la unica DB local).

### Dependencias: no hace falta `pnpm add`

`apps/api/package.json:38-46,74` ya declara `@nestjs/jwt`, `@nestjs/passport`,
`passport`, `passport-jwt`, `@types/passport-jwt`, `@nestjs/throttler` (6.5.0) y
`argon2`. El plan no instala nada.

### Hallazgo critico 1: como se registra el guard global decide si los e2e sirven

`test/utils/create-test-app.ts:17-29` reconstruye a mano las piezas de
`main.ts` que afectan al request (prefijo, pipe, filtro) e importa `AppModule`.
Consecuencia directa:

- Si el guard se registra en `main.ts` con `app.useGlobalGuards(...)`, **los e2e
  no lo tendrian**: los tests pasarian con todo abierto mientras produccion
  queda cerrada. Verde falso, justo en la zona de riesgo.
- Si se registra como **provider `APP_GUARD` dentro de `AuthModule`**, entra por
  `AppModule` y los e2e ejercitan exactamente el mismo cableado.

**Decision: `APP_GUARD` en el modulo, nunca `useGlobalGuards` en `main.ts`.** Y
sin tocar `create-test-app.ts` para "arreglarlo": si un dia hiciera falta
tocarlo para que un test pase, es senal de que el guard esta mal registrado.

### Hallazgo critico 2: el guard global rompe los e2e existentes en el mismo commit

Hoy hay 27 tests e2e verdes contra rutas abiertas. En cuanto el
`JwtAuthGuard` sea global, devuelven 401:

- `test/catalog.e2e-spec.ts` y `test/projects.e2e-spec.ts` (rutas de lectura
  publica), `test/swagger.e2e-spec.ts` (`/docs`), `test/app.e2e-spec.ts`
  (`/health`).
- Los controllers afectados: `plans.controller.ts:18`, `zones.controller.ts`,
  `projects.controller.ts`, `health.controller.ts`. Los tres primeros ya llevan
  un docblock que dice que les falta `@Public()` cuando exista el guard.

Por eso **la fase que activa el guard aplica `@Public()` en la misma fase**, y
su gate incluye correr los e2e viejos, no solo los nuevos. `/health` y `/docs`
estan fuera del prefijo `v1` (`main.ts:18`) pero **no** fuera del guard: el
guard es global por instancia, no por prefijo.

### Hallazgo critico 3: el throttler puede volver rojos los e2e

El spec pide 10 req/min en `/auth/*`. La bateria e2e de este plan hace, entre
registro, login, refresh, logout y los logins de setup de `/me` y de admin,
**mas de 10 llamadas a `/auth/*` por corrida**, y `jest-e2e.json` usa
`maxWorkers: 1` (todos los specs comparten proceso y ventana de tiempo). Con el
limite fijo en 10, los e2e fallarian con 429 de forma intermitente: el peor tipo
de rojo, porque invita a debilitar el test.

**Decision: el limite es configurable por entorno.** `AUTH_THROTTLE_LIMIT`
(default 10) y `AUTH_THROTTLE_TTL_MS` (default 60000) entran en
`src/infra/config/env.ts:3-12`; los e2e corren con un limite alto. Produccion
mantiene 10/min. **No** se usa `@SkipThrottle()` en tests ni se relaja la regla:
se parametriza, y un test dedicado verifica el 429 con limite bajo.

### Hallazgo 4: huecos del contrato en shared y api-client

- `packages/shared/src/api-paths.ts:6-10` tiene `auth.register|login|refresh`
  pero **no `logout`**, que el spec exige. Hay que agregarlo.
- `packages/shared/src/types/auth.ts:3-19` define `AuthTokens`, `UserProfile` y
  `AuthResponse` como **interfaces a mano**. El item 02 ya migro `Plan` a
  `z.infer<typeof planSchema>`: para que los DTO puedan hacer
  `createZodDto(...)` hace falta el schema zod, y conviene derivar los tipos de
  ahi (misma forma, un solo origen).
- `packages/api-client/src/resources/me.ts:7` solo tiene `get`; falta
  `update({ name })` para `PATCH /v1/me`. `auth.ts` no tiene `logout`.
  Se completan en este plan para que el contrato no quede a medias.
- `listResponseSchema` ya existe (`schemas/catalog.ts:59`) y sirve para
  `GET /v1/admin/users`.

### Hallazgo 5: discrepancias del spec 05 contra el codigo (gana el codigo)

1. El spec dice que `onboardingCompleted` es "campo nuevo en User; misma
   migracion". **Ya existe** en `schema.prisma:63` desde el item 01. La
   migracion de este plan crea **solo** `RefreshToken`.
2. El spec pide `POST /auth/logout` pero `API_PATHS` no lo tiene (hallazgo 4).
3. El spec llama al listener de `users` sobre `subscription.activated`, pero el
   emisor (`subscriptions`) es del item 06. El listener se escribe y se testea
   unitariamente disparando el evento a mano; el camino completo lo cierra 06.

### Que se puede verificar

`quality-check.sh --scope api --only typecheck,lint,unit,e2e`. El e2e necesita
Postgres arriba; el item 02 fijo el nombre del proyecto de docker compose
(`6f0337e`), asi que la deteccion tambien funciona desde un worktree. **Ojo con
`packages/shared`**: `dist/` es artefacto gitignorado y `quality-check.sh`
llama a `pnpm --filter <ws> typecheck` directo, **sin** encadenar el `^build` de
turbo. Toda fase que toque shared debe correr
`pnpm --filter @oneimpact/shared build` antes de verificar, o vera errores
fantasma de "has no exported member" (paso en el merge del item 02).

## Decisiones pendientes (bloqueantes)

**(ninguna bloqueante).** Cinco decisiones tomadas por defecto, todas
reversibles sin rehacer el plan:

1. **`APP_GUARD` en `AuthModule`**, no `useGlobalGuards` en `main.ts` (hallazgo
   1). Es lo que hace que los e2e prueben lo mismo que corre en produccion.
2. **Throttler parametrizado por env** (hallazgo 3), nunca desactivado en tests.
3. **`RefreshToken` como tabla propia**, con el token **hasheado con argon2** (no
   en claro, no un JWT guardado tal cual), `@@index([userId])`, `expiresAt`,
   `revokedAt` y `replacedById` para poder detectar reuso. Alternativa
   descartada: `jti` en el JWT y una lista de revocados; mas simple pero no deja
   rastro de la cadena de rotacion.
4. **Reuso de refresh = revocacion de toda la cadena del usuario**, no solo 401.
   Es la respuesta estandar ante un refresh robado. Si se prefiere solo 401, es
   un cambio de tres lineas en el use case.
5. **`PATCH /me` acepta unicamente `name`.** `updateProfileSchema` es un objeto
   **estricto** (`.strict()`), de modo que `{role:'ADMIN'}` da 400 por schema y
   no depende de que nadie se acuerde de filtrar el campo. Es la forma
   estructural de cumplir la invariante "el rol nunca es editable por el propio
   usuario".

## Principios

Aditivo antes que destructivo; verde por fase; **casos negativos obligatorios**
en toda fase que toque auth o roles; schemas una sola vez en `packages/shared`;
los modulos se hablan por eventos (salvo `catalog`, que es lectura); errores de
dominio tipados, nunca `HttpException` desde un use case; ningun log con
password, token ni hash; sin supresiones nuevas; identificadores en ingles.

## Mapa de fases

| Fase | Nombre                                   | Area               | Impacto                 | Shared | Prisma                | Commit sugerido                                       |
| ---- | ---------------------------------------- | ------------------ | ----------------------- | ------ | --------------------- | ----------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                | --                 | Ninguno                 | No     | No                    | _(sin commit)_                                        |
| 1    | Contrato de auth en shared + api-client  | shared, api-client | Aditivo                 | Si     | No                    | `feat(shared): auth response schemas and logout path` |
| 2    | Modelo `RefreshToken` + migracion        | api                | Aditivo                 | No     | Si (`refresh_tokens`) | `feat(api): refresh token model`                      |
| 3    | Modulo `auth`: registro, login, tokens   | api                | Aditivo                 | No     | No                    | `feat(api): jwt auth with refresh rotation`           |
| 4    | Guard global + `@Public()` + throttler   | api                | **Invierte el default** | No     | No                    | `feat(api): global jwt guard and auth throttling`     |
| 5    | `RolesGuard` + modulo `users` + listener | api                | Aditivo                 | No     | No                    | `feat(api): roles guard and users module`             |
| 6    | e2e de auth y roles (casos negativos)    | api                | Aditivo                 | No     | No                    | `test(api): auth and roles e2e coverage`              |
| 7    | Cierre: bateria completa + ai-log        | --                 | Ninguno                 | No     | No                    | `docs: log ai session api-auth-and-roles`             |

---

## Fase 0 -- Pre-flight

**Objetivo**: confirmar que el estado del repo es el que el plan asume.
**Acciones**:

1. Rama `feat/api-auth-and-roles`; `git status --short` limpio.
2. Postgres arriba (`docker ps | grep oneimpact-db-1`); si no, `pnpm db:up`.
3. `pnpm --filter @oneimpact/shared build` y `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit,e2e` en verde (baseline: 23 unit + 27 e2e).
4. Confirmar los hallazgos: `onboardingCompleted` existe en `schema.prisma:63`;
   `RefreshToken` **no** existe; `IS_PUBLIC_KEY` existe en
   `public.decorator.ts:3`; las deps de auth estan en `package.json:38-46`.
5. Anotar el conteo de e2e de partida: la fase 4 debe dejarlo igual o mayor,
   nunca menor.

CHECKPOINT -- sin commit.

## Fase 1 -- Contrato de auth en shared + api-client

**Objetivo**: los schemas zod que los DTO de la API van a envolver, y cerrar los
dos huecos del cliente.
**Area**: shared, api-client
**Archivos**: `packages/shared/src/schemas/auth.ts:1-15`, `packages/shared/src/types/auth.ts:1-19`, `packages/shared/src/api-paths.ts:6-10`, `packages/shared/src/schemas/auth.test.ts` (nuevo), `packages/api-client/src/resources/{auth,me}.ts`
**Shared**: **si**. Todo aditivo. Consumidores revisados con grep (24 archivos):
ninguno cambia de forma; `AuthTokens`, `UserProfile` y `AuthResponse` conservan
su shape exacta al pasar a `z.infer`.
**Prisma**: no. **Eventos**: no.
**Acciones**:

1. `schemas/auth.ts`: agregar `userProfileSchema` (`id`, `email` email, `name`,
   `role` enum de `Role`), `authTokensSchema` (`accessToken`, `refreshToken`),
   `authResponseSchema` (`{ user, tokens }`), `refreshTokenSchema`
   (`{ refreshToken: string().min(1) }`), `updateProfileSchema`
   (`{ name: string().min(2).max(80) }` **con `.strict()`**, ver Decision 5),
   `updateUserRoleSchema` (`{ role: enum(Role) }`). Mensajes en espanol.
2. `types/auth.ts`: pasar las tres interfaces a `z.infer` de los schemas de
   arriba (mismo nombre exportado, misma forma). No romper el `import type` de
   `packages/api-client`.
3. `api-paths.ts`: agregar `auth.logout: '/v1/auth/logout'`.
4. `schemas/auth.test.ts` (Vitest): `updateProfileSchema` **rechaza**
   `{ name:'X', role:'ADMIN' }` (el caso que protege la invariante) y rechaza
   `name` de 1 caracter; `refreshTokenSchema` rechaza `''`; `authResponseSchema`
   acepta una respuesta bien formada.
5. `api-client`: `auth.logout()` (POST a `API_PATHS.auth.logout`) y
   `me.update(input: UpdateProfileInput)` (PATCH a `API_PATHS.me`).
6. `pnpm --filter @oneimpact/shared build` (obligatorio, ver hallazgo "Que se
   puede verificar").

**Verificacion**:

- `pnpm --filter @oneimpact/shared build && bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck` (consumidor
  principal; debe seguir verde sin tocar nada de la API)
- `pnpm typecheck` en la raiz (turbo encadena el build; cubre mobile y admin)

**Riesgos**: pasar interfaces a `z.infer` puede cambiar la opcionalidad de algun
campo sin querer. Mitigacion: el typecheck de `api-client` y de `apps/api` es el
detector; si algo se rompe, es un error de este plan, no del consumidor.

CHECKPOINT. **Commit sugerido**: `feat(shared): auth response schemas and logout path`

## Fase 2 -- Modelo `RefreshToken` + migracion

**Objetivo**: la tabla donde vive el refresh hasheado, con lo necesario para
rotar y detectar reuso.
**Area**: api
**Archivos**: `apps/api/prisma/schema.prisma:57-73` (relacion en `User`) y modelo nuevo; `apps/api/prisma/migrations/<ts>_refresh_tokens/` (generada, nunca editada a mano)
**Shared**: no. **Eventos**: no.
**Prisma**: **si**. Migracion `refresh_tokens`. **Seed sin cambios** (no se
siembran tokens). MSW no existe aun.
**Acciones**:

1. (implementer) Modelo `RefreshToken`: `id` cuid, `userId` + relacion a `User`
   (`onDelete: Cascade`), `tokenHash String` (argon2 del token, **nunca** el
   token en claro), `expiresAt DateTime`, `revokedAt DateTime?`,
   `replacedById String?` (para seguir la cadena de rotacion), `createdAt`,
   `userAgent String?`, `@@index([userId])`, `@@index([expiresAt])`. Agregar
   `refreshTokens RefreshToken[]` a `User`. Comentario de una linea explicando
   que el hash existe para que un volcado de la tabla no permita renovar sesion.
2. (orquestador, no el implementer) `pnpm --filter @oneimpact/api exec prisma migrate dev --name refresh_tokens` y `prisma generate`.
3. (implementer) Extender `src/infra/prisma/prisma-enums.spec.ts` **no** hace
   falta (no hay enums nuevos); en su lugar, un test de shape minimo no aporta.
   Esta fase se verifica con typecheck y con que el e2e existente siga verde.

**Verificacion**:

- `pnpm --filter @oneimpact/api exec prisma validate`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck,unit,e2e`
  (los 27 e2e existentes deben seguir verdes: la migracion es puramente aditiva)
- Pendiente manual: `prisma studio` -> la tabla existe y `User` la relaciona.

**Riesgos**: `prisma migrate dev` puede pedir reset si la DB local tiene drift.
Aceptar reset **solo** en local; nunca contra Supabase. Si aparece drift, STOP y
reportar: significa que otro plan toco el schema en paralelo.

CHECKPOINT. **Commit sugerido**: `feat(api): refresh token model`

## Fase 3 -- Modulo `auth`: registro, login, tokens

**Objetivo**: los cuatro endpoints y la logica de tokens, **todavia sin guard
global** (para que esta fase no rompa nada existente).
**Area**: api
**Archivos**: `src/modules/auth/auth.module.ts`, `controllers/auth.controller.ts`, `controllers/dto/{auth-response,refresh,register,login}.dto.ts`, `application/auth.service.ts`, `application/tokens.service.ts`, `infrastructure/{users,refresh-token}.repository.ts`, `domain/auth.events.ts`, `application/auth.service.spec.ts`, `application/tokens.service.spec.ts`; registro en `src/app.module.ts:20-22`
**Shared**: no (consume lo de la fase 1). **Prisma**: no (usa la fase 2).
**Eventos**: **emite `user.registered`** via `EventBus.publish` (constante
`EventName.USER_REGISTERED`, `event-names.ts:12`). Payload plano: `{ userId,
email, name }`, sin entidades Prisma y **sin** password ni hash.
**Acciones**:

1. `tokens.service.ts`: firma y verificacion. Access 15 min con
   `JWT_ACCESS_SECRET`, refresh 30 d con `JWT_REFRESH_SECRET` (ya en
   `env.ts:9-10`). Payload del access: `{ sub, email, role }`. Metodos
   `issuePair(user)`, `verifyRefresh(token)`, `hashToken`/`verifyTokenHash`
   (argon2).
2. `refresh-token.repository.ts`: `create`, `findActiveByUser`, `revoke`,
   `revokeAllForUser`, `markReplaced`. El lookup se hace por `userId` +
   comparacion argon2 del hash (no se puede buscar por hash directo).
3. `auth.service.ts`:
   - `register`: `registerSchema` de shared; argon2 del password; email
     duplicado -> `DomainError('EMAIL_TAKEN', 409, ...)`; publica
     `user.registered`; devuelve `{ user, tokens }`.
   - `login`: **mismo error para email inexistente y password incorrecto**
     (`DomainError('INVALID_CREDENTIALS', 401, ...)`), y ademas ejecutar el
     verify de argon2 aunque el usuario no exista, para no filtrar por tiempo
     de respuesta que el email existe.
   - `refresh`: valida firma, busca el registro activo, rota (revoca el viejo,
     crea el nuevo, setea `replacedById`). **Reuso de un token ya revocado ->
     revoca toda la cadena del usuario y 401** (Decision 4).
   - `logout`: revoca el refresh recibido. Idempotente: logout dos veces no
     falla.
4. `auth.controller.ts`: `@Controller('auth')` (sin `/v1`, lo pone
   `setGlobalPrefix`, ver el docblock de `plans.controller.ts:1-9`). DTO con
   `createZodDto`. `@ApiTags('auth')` y `@ApiOkResponse` para Swagger.
5. Unit tests (obligatorios por la regla 30): `auth.service.spec.ts` con repos
   mockeados -- registro feliz, email duplicado -> 409, login con password mala
   -> 401 con el **mismo** code que email inexistente, refresh reusado revoca la
   cadena; `tokens.service.spec.ts` -- el par se firma con secretos distintos y
   el access expira a los 15 min (con timers falsos).
6. Registrar `AuthModule` en `app.module.ts`.

**Verificacion** (acotada, aun sin guard):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only e2e` (los 27 existentes
  siguen verdes: todavia no se cerro nada)
- **Casos negativos cubiertos en unit**: 409 email duplicado, 401 credenciales
  invalidas indistinguibles, 401 refresh reusado.

**Riesgos**: argon2 es lento a proposito (~100-300 ms). Los unit tests deben
mockear el hashing o el `describe` se vuelve lento; los e2e de la fase 6 usan
`jest.setTimeout` generoso, como ya hace `seed.e2e-spec.ts`.

CHECKPOINT. **Commit sugerido**: `feat(api): jwt auth with refresh rotation`

## Fase 4 -- Guard global + `@Public()` + throttler

**Objetivo**: invertir el default. **Es la fase mas riesgosa del plan**: aca es
donde algo mal hecho deja rutas abiertas o rompe las publicas.
**Area**: api
**Archivos**: `src/modules/auth/{strategies/jwt.strategy.ts,guards/jwt-auth.guard.ts}`, `src/common/decorators/current-user.decorator.ts`, `src/modules/auth/auth.module.ts` (providers `APP_GUARD`), `src/infra/config/env.ts:3-12` (dos vars nuevas), `src/modules/catalog/controllers/{plans,zones}.controller.ts`, `src/modules/projects/controllers/projects.controller.ts`, `src/modules/health/health.controller.ts`, `src/modules/auth/controllers/auth.controller.ts`, `src/modules/auth/guards/jwt-auth.guard.spec.ts`
**Shared**: no. **Prisma**: no. **Eventos**: no.
**Acciones**:

1. `jwt.strategy.ts` (passport-jwt): extrae el bearer, valida con
   `JWT_ACCESS_SECRET`, devuelve `{ id, email, role }`. **No** consulta la DB en
   cada request (el rol viaja en el token; `PATCH /admin/users/:id/role` invalida
   por rotacion natural del access a los 15 min -- anotarlo en un comentario).
2. `jwt-auth.guard.ts`: extiende `AuthGuard('jwt')` y lee `IS_PUBLIC_KEY` con
   `Reflector.getAllAndOverride` (metodo **y** clase) para dejar pasar lo
   publico.
3. `current-user.decorator.ts`: `@CurrentUser()` sacando `request.user`, tipado
   con `UserProfile` de shared (sin `any`).
4. Registrar en `AuthModule`: `{ provide: APP_GUARD, useClass: JwtAuthGuard }`
   (Decision 1). **Prohibido** `app.useGlobalGuards` en `main.ts` y **prohibido**
   tocar `test/utils/create-test-app.ts`.
5. `@Public()` en: `auth.controller.ts` (register, login, refresh; **logout NO**,
   requiere sesion), `plans.controller.ts`, `zones.controller.ts`,
   `projects.controller.ts` (solo los GET de lectura) y `health.controller.ts`.
   Borrar de esos archivos el docblock que decia que `@Public()` era inerte:
   ya no lo es.
6. Throttler: `ThrottlerModule.forRoot` con `AUTH_THROTTLE_TTL_MS` y
   `AUTH_THROTTLE_LIMIT` de `env.ts` (defaults 60000 y 10), aplicado **solo al
   controller de auth** con `@UseGuards(ThrottlerGuard)` (no global, para no
   estrangular el catalogo publico). Agregar las dos vars a `.env.example`
   -- **ojo: `.env*` es ruta prohibida para el implementer**, ese archivo lo
   edita el orquestador.
7. `jwt-auth.guard.spec.ts`: con `@Public()` deja pasar sin token; sin
   `@Public()` y sin token lanza 401; con token valido pone `request.user`.

**Verificacion** (la mas exigente del plan):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only e2e` -- **el conteo de
  e2e debe ser >= el de la fase 0 (27)**. Si alguno de catalog/projects/swagger/
  health pasa a 401, falta un `@Public()`: se arregla el controller, **jamas** el
  test.
- **Casos negativos**: `GET /v1/me` sin token -> 401 (aunque el endpoint llegue
  en la fase 5, cualquier ruta no publica sirve para comprobar el 401);
  `/health` y `/docs` siguen abiertos.
- Pendiente manual: `pnpm dev:api` y abrir `/docs` en el navegador (Swagger no
  debe quedar detras del guard).

**Riesgos**: (a) olvidar un `@Public()` -> rompe un cliente sin que ningun test
lo note si el e2e tampoco lo cubre; por eso el gate corre **todos** los e2e.
(b) `/docs` y `/health` estan fuera del prefijo `v1` pero **no** del guard.
(c) Si el throttler quedara global, los e2e de catalogo darian 429 intermitente.

CHECKPOINT. **Commit sugerido**: `feat(api): global jwt guard and auth throttling`

## Fase 5 -- `RolesGuard` + modulo `users` + listener

**Objetivo**: perfil propio, gestion de roles para admin, y el listener de
onboarding.
**Area**: api
**Archivos**: `src/common/decorators/roles.decorator.ts`, `src/modules/auth/guards/roles.guard.ts` (+ `.spec.ts`), `src/modules/users/users.module.ts`, `controllers/{me,admin-users}.controller.ts`, `controllers/dto/*.dto.ts`, `application/users.service.ts` (+ `.spec.ts`), `infrastructure/users.repository.ts`, `application/users.listener.ts` (+ `.spec.ts`); registro en `src/app.module.ts`
**Shared**: no (consume la fase 1). **Prisma**: no.
**Eventos**: **escucha `subscription.activated`** (`EventName.SUBSCRIPTION_ACTIVATED`)
para marcar `onboardingCompleted`. El emisor llega en el item 06.
**Acciones**:

1. `roles.decorator.ts` (`@Roles('ADMIN')`) + `roles.guard.ts` leyendo el
   metadata con `Reflector` y comparando contra `request.user.role`. Registrado
   como segundo `APP_GUARD` **despues** del de JWT (el orden de los providers
   define el orden de ejecucion: sin usuario autenticado, el de roles no puede
   decidir).
2. `me.controller.ts`: `GET /me` (devuelve `UserProfile` del `@CurrentUser()`,
   releido de la DB para reflejar cambios de nombre) y `PATCH /me` con
   `updateProfileSchema` **estricto**: `{role:'ADMIN'}` -> 400 por el pipe zod,
   sin que el use case tenga que filtrar nada (Decision 5).
3. `admin-users.controller.ts`: `GET /admin/users` con `@Roles('ADMIN')`,
   respuesta `{ items, total }` con `listResponseSchema(userProfileSchema)`;
   `PATCH /admin/users/:id/role` con `updateUserRoleSchema`. **Un admin no puede
   quitarse a si mismo el rol ADMIN** si es el ultimo: `DomainError('LAST_ADMIN',
409, ...)` -- no esta en el spec, pero evita dejar el sistema sin
   administrador; si se prefiere permitirlo, se borra esa guarda.
4. `users.listener.ts`: `@OnEvent(EventName.SUBSCRIPTION_ACTIVATED)` ->
   `onboardingCompleted = true`. **Idempotente**: un `update` por `userId` que
   corre dos veces deja el mismo estado. Nunca lanza para abortar al emisor:
   loguea y sigue (regla 30).
5. Unit tests: `roles.guard.spec.ts` (sin `@Roles` deja pasar; con
   `@Roles('ADMIN')` y usuario USER -> 403; con ADMIN -> pasa);
   `users.service.spec.ts` (`PATCH /me` no puede tocar el rol; ultimo admin ->
   409); `users.listener.spec.ts` (**el evento llega dos veces y el resultado es
   el mismo**).
6. Registrar `UsersModule` en `app.module.ts`.

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- **Casos negativos en unit**: 403 rol insuficiente, 400 al editarse el rol,
  evento duplicado sin efecto.

**Riesgos**: el orden de los `APP_GUARD` importa; si `RolesGuard` corriera antes
del de JWT, `request.user` seria `undefined` y podria dejar pasar. El
`roles.guard.spec.ts` debe cubrir explicitamente el caso "sin usuario en el
request -> 403", no solo el rol equivocado.

CHECKPOINT. **Commit sugerido**: `feat(api): roles guard and users module`

## Fase 6 -- e2e de auth y roles

**Objetivo**: los criterios de aceptacion del spec, extremo a extremo contra
Postgres.
**Area**: api
**Archivos**: `apps/api/test/auth.e2e-spec.ts`, `apps/api/test/users.e2e-spec.ts`, `apps/api/test/utils/auth-helpers.ts` (login del seed y helper de bearer)
**Shared**: no. **Prisma**: no. **Eventos**: no.
**Acciones**:

1. `auth-helpers.ts`: `loginAs(app, 'admin'|'user')` usando las credenciales del
   seed (`admin@oneimpact.org / Admin123!`, `ana@oneimpact.org / User123!`) y
   `bearer(token)`. Emails nuevos por test con sufijo unico, para no chocar con
   el seed ni entre corridas (el seed es idempotente pero los registros de test
   no se limpian).
2. `auth.e2e-spec.ts` -- criterios del spec, uno por test:
   - register -> 201 con `{ user, tokens }`; el mismo email otra vez -> **409**.
   - login correcto -> 200; password mala -> **401**; email inexistente -> **401
     con el mismo `code` y el mismo mensaje** (asercion explicita de que son
     indistinguibles).
   - refresh -> 200 con par nuevo; **reusar el refresh viejo -> 401**.
   - logout -> 204/200; usar despues ese refresh -> 401.
   - **Ningun response body contiene `passwordHash`** (asercion explicita).
   - Throttling: con `AUTH_THROTTLE_LIMIT` bajo via env, la llamada N+1 -> 429.
3. `users.e2e-spec.ts`:
   - `GET /v1/me` sin token -> **401**; con token -> 200 con el perfil.
   - `GET /v1/me` con un access **expirado** (firmado a mano con el mismo
     secreto y `expiresIn: '-1s'`) -> **401**.
   - `PATCH /v1/me {name}` -> 200; `PATCH /v1/me {role:'ADMIN'}` -> **400**;
     comprobar ademas en la DB que el rol **no** cambio.
   - `GET /v1/admin/users` como USER -> **403**; como ADMIN -> 200 `{items,total}`.
   - `PATCH /v1/admin/users/:id/role` como USER -> 403; como ADMIN -> 200.
4. Confirmar que las rutas publicas siguen abiertas: un GET a `/v1/plans` **sin**
   token -> 200 (protege contra una regresion futura del guard).

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope api --only e2e` con Postgres
  arriba. Conteo esperado: 27 previos + los nuevos.
- Revisar la salida de los e2e: **ningun log con password, token ni hash**
  (invariante del spec).

**Riesgos**: los tests de registro dejan usuarios en la DB local; usar emails con
sufijo unico y no asumir conteos absolutos de `user.count()` en otros specs --
`seed.e2e-spec.ts` **si** afirma `user.count() === 2` y se rompera. Mitigacion:
que `auth.e2e-spec.ts` borre en `afterAll` los usuarios que creo, o que
`seed.e2e-spec.ts` cuente solo los dos emails del seed. **Decidir esto en la
fase 6 y anotarlo**: es la interferencia mas probable de todo el plan.

CHECKPOINT. **Commit sugerido**: `test(api): auth and roles e2e coverage`

## Fase 7 -- Cierre

**Objetivo**: bateria completa y registro de la sesion.
**Acciones**:

1. `pnpm --filter @oneimpact/shared build` (la fase 1 toco shared) y
   `bash scripts/dev/quality-check.sh --scope all` con Postgres arriba.
2. Checklist de los criterios de aceptacion del spec 05, uno por uno, con
   `[OK]` o `SIN CONFIRMAR`.
3. Anotar en el vault (`arquitectura-sistema.md`, seccion "Autenticacion y
   roles") lo que se decidio y no estaba escrito: refresh hasheado en tabla
   propia con cadena de rotacion, reuso -> revocacion total, throttling
   parametrizado por env, y que el rol viaja en el access token (ventana de
   hasta 15 min tras un cambio de rol).
4. `/ai-log` -> `docs: log ai session api-auth-and-roles`.

**Verificacion**: `--scope all` con conteos; `git log --oneline main..HEAD` con
6 commits de codigo + 1 de docs.

CHECKPOINT final. Si se ejecuto con `/run-plan-worktree`, cerrar con
`/merge-plan api-auth-and-roles`; el push y el PR son del usuario.
