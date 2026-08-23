# Plan -- Capa de datos y sesion de mobile (por fases, checkpoint por fase)

> **Fecha**: 2026-08-22
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/07-mobile-data-layer-and-auth.md` (ola 2, en paralelo con 05; 05 ya esta mergeado a `main` en `07f5d04`, asi que el contrato de auth es codigo real, no promesa)
> **Base**: spec 07; vault `01-Tecnologia-Arquitectura/arquitectura-mobile.md` (secciones "Navegacion", "Sesion y roles", "Capas", "Flujo de datos", lineas 11-70); reglas `20-mobile-conventions.md` y `50-testing-and-verification.md`; planes previos `20260822-mobile-zones-screens.plan.md` (lo que se migra), `20260822-shared-contract-and-seed.plan.md` (dataset), `20260822-api-catalog-and-projects.plan.md` y `20260822-api-auth-and-roles.plan.md` (el contrato realmente servido)
> **Areas**: mobile (+ `packages/api-client`: dos correcciones de contrato, ver Decisiones D1)
> **Contrato shared tocado**: **no**. `packages/shared` solo se consume. Consumidores hoy (grep): `apps/api/src`, `apps/api/prisma/seed.ts`, `packages/api-client/src`, `apps/mobile/src/data/*`. Ninguno cambia de forma.
> **Schema Prisma tocado**: no. Sin migracion, sin cambios de seed.
> **Eventos**: ninguno (mobile no publica ni escucha eventos de dominio).
> **Zonas de riesgo**: (1) **auth y tokens** -- secure-store, refresh 401, `role` desde `GET /me`; (2) **MSW dentro de Metro/Jest** -- dependencias nuevas con polyfills, se verifica con `expo export`; (3) **config de bundling** -- si hace falta tocar `metro.config.js` o `transformIgnorePatterns`; (4) dos **mismatches reales de contrato** ya detectados en `packages/api-client`. Pago simulado: **no se toca** en este item (es el 09).
> **Fase del roadmap**: Fase 1 (entrega lun 24 ago 2026 18:00) -- ola 2
> **Como ejecutar**: `/run-plan-worktree` (el que indica el spec) | `/run-plan-guided`

## Objetivo

Dejar `apps/mobile` con una capa de datos y de sesion completas y verificables:

- `src/api`: cliente tipado sobre `@oneimpact/api-client` con refresh 401,
  `queryClient` propio, keys centralizadas y los hooks de lectura y mutacion que
  consumen 08, 09 y 10.
- `src/api/msw`: handlers que cubren **todo** el contrato REST con el mismo seed
  de `@oneimpact/shared`, para que la demo funcione con la API caida.
- `src/auth`: `AuthProvider` sobre `expo-secure-store`, `useAuth`,
  `useRequireAuth`, `useRequireRole`, y el switch de grupos `(tabs)` / `(app)`.
- **Zonas** consumiendo hooks en vez de datos estaticos, con estados de carga y
  error, sin un solo cambio visual cuando los datos estan.

No entra ninguna pantalla nueva (08, 09, 10) ni la UI de login (09).

## Contexto y hallazgos del analisis

### 1. Lo que ya existe y no hay que inventar

`packages/api-client` **ya cubre el contrato completo** (`src/index.ts:19-33`):
`auth`, `me`, `plans`, `zones`, `projects`, `subscriptions`, `dashboard`,
`notifications`, `admin`. El wrapper `createRequestFn`
(`packages/api-client/src/http.ts:19-36`) ya inyecta `Authorization` desde un
`getToken` async y ya lanza `ApiError` con `status`. Es decir: **el "cliente"
que pide el spec no es un `fetch` nuevo, es una composicion**: `createApiClient`

- una capa fina de mobile que aporta `getToken` y el reintento del 401. Cualquier
  `fetch` propio en `src/api` seria una violacion de la invariante del spec
  ("ningun `fetch` fuera de `api-client`").

`app/_layout.tsx:14` ya crea un `QueryClient` a nivel de modulo y lo monta en
`app/_layout.tsx:32`. Solo hay que moverlo a `src/api/queryClient.ts` y darle
`staleTime`/`retry`.

`expo-secure-store` ya esta declarado (`apps/mobile/package.json:22`). No es
dependencia nueva.

### 2. Dos mismatches reales entre `packages/api-client` y la API servida

Encontrados leyendo los controllers de 02 y 05, ya mergeados a `main`:

| #   | Cliente dice                                                                      | API hace                                                                                                                                                                                                  | Efecto                                                                                                                    |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| M1  | `plans.list()` devuelve `Plan[]` (`packages/api-client/src/resources/plans.ts:7`) | `CatalogService.listPlans` devuelve `{ items, total }` (`apps/api/src/modules/catalog/application/catalog.service.ts:23-27`), DTO `listResponseSchema(planSchema)` (`.../controllers/dto/plan.dto.ts:10`) | `usePlans().data.map(...)` explota en runtime; el typecheck **no** lo ve porque el tipo es una mentira, no una inferencia |
| M2  | `auth.logout()` no manda body (`packages/api-client/src/resources/auth.ts:22-25`) | `AuthController.logout` exige `RefreshDto` (`{ refreshToken }`) y **no** es `@Public()` (`apps/api/src/modules/auth/controllers/auth.controller.ts:56-61`)                                                | `signOut()` contra la API real responde 400                                                                               |

`GET /v1/zones` y `GET /v1/zones/:slug` **si** coinciden
(`catalog.service.ts:29-44` vs `resources/zones.ts:7-8`), igual que
`GET /v1/projects` (`{items,total}`) y `POST/GET /v1/auth/*`.

Radio de impacto de arreglarlo: `packages/api-client` tiene hoy **cero
consumidores vivos**. `apps/admin/package.json:20` lo declara pero
`apps/admin/src/**` no lo importa (grep sin resultados fuera del `package.json`).
El unico consumidor es su propio test (`packages/api-client/src/index.test.ts`).
Riesgo de la correccion: minimo. Ver **D1**.

### 3. La imagen no puede venir de la API (y eso condiciona la migracion)

`src/data/zones.ts:14-25` mapea `imageKey` -> `require()` con literales
estaticos **porque Metro lo exige**. Un `require()` armado con template string
no bundlea. Consecuencia: los hooks devuelven `Zone` con `imageKey: string`
(contrato de `packages/shared/src/schemas/catalog.ts:18-25`) y la resolucion a
asset sigue siendo **local**, via `assetFor()`. La migracion cambia _de donde
salen los datos_, no como se resuelven las imagenes.

Pero `assetFor` **lanza** con una clave no mapeada (`src/data/zones.ts:32-38`).
Eso estaba bien cuando la fuente era el seed compilado (una clave nueva era un
bug de build). Con datos remotos, una zona creada desde el admin con un
`imageKey` desconocido **tumba la pantalla entera**. Ver **D3**.

### 4. Hueco de contrato: los avances no vienen en el detalle de zona

`GET /v1/zones/:slug` devuelve `Zone & { projects: Project[] }`
(`catalog.service.ts:35-44`), y `toProjectSummary`
(`apps/api/src/modules/catalog/infrastructure/catalog.mapper.ts:44-59`)
**no incluye `updates`**: el `Project` del contrato compartido no los tiene
(`packages/shared/src/schemas/catalog.ts:27-41`); solo `ProjectWithUpdates`
(`.../catalog.ts:54-57`), que sirve `GET /v1/projects/:id`.

Hoy los avances salen de `SEED_PROJECTS[].updates[0]`
(`src/data/zones.ts:67-77`). Contra la API no hay forma de obtenerlos ni en
`/v1/zones` ni en `/v1/zones/:slug` sin un N+1. Ver **D2**.

### 5. Las secciones de Zonas no son presentacionales todavia

Dos de las seis leen datos del modulo directamente:

- `src/features/zones/ZonesList.tsx:4` importa `zones` (array de modulo).
- `src/features/zones/AdvancesCarousel.tsx:4` importa `advances`.

Las otras cuatro (`ZonesHero`, `ZoneAdvances`, `ZoneDetailHero`,
`ZoneEmptyAdvances`) solo importan **copy** (`zonesScreen`, `zoneDetail`), que
se queda donde esta: es contenido estatico de marketing, no dato remoto
(vault `arquitectura-mobile.md:65-69`).

Cambiar la firma de esas dos secciones rompe dos tests existentes que hay que
actualizar en la misma fase: `apps/mobile/__tests__/zones-data.test.ts:1`
(importa `zones`, `advances`, `advancesByZone`, `getZone`) y
`apps/mobile/__tests__/zone-detail.test.tsx:3`.

**Home no se ve afectado**: `src/features/home/ZonesCarousel.tsx:4` usa
`homeZones` de `src/data/home.ts:89-91`, con sus propios `require()`. No toca
`data/zones.ts`. El write-scope del spec se respeta sin excepciones.

### 6. MSW no esta instalado en ningun workspace

`grep '"msw"'` en `apps/*/package.json` y `packages/*/package.json`: sin
resultados. Son dependencias nuevas -- **las instala el usuario**, como dice el
spec. Y el seed no es directamente serializable como respuesta: `SeedZone` es
`Omit<Zone,'id'>` y `SeedProject` es `Omit<Project,'id'|'zoneId'|'createdAt'>`
mas `zoneSlug` y `updates` (`packages/shared/src/seed-data.ts:5-18`). Los
handlers necesitan un mapper seed -> contrato que sintetice ids estables.

### 7. Verificacion disponible

`bash scripts/dev/quality-check.sh --list` -> `scopes: mobile api admin shared
all | steps: typecheck lint unit e2e bundle`. Para mobile los pasos son
`typecheck`, `lint`, `unit` (con `--filter`, ver `scripts/dev/quality-check.sh:41-44`)
y `bundle` (`expo export --platform android`, `scripts/dev/quality-check.sh:63-69`).
`--scope all` corre una sola vez, en la ultima fase.

### 8. Detalles que van a morder si no se anotan

- `app.json:31-33` tiene `experiments.typedRoutes: true`. Crear el grupo `(app)`
  regenera `.expo/types`; hasta que Metro corra una vez, `router.replace('/dashboard')`
  puede no tipar. Se resuelve con `as Href`, igual que ya hace
  `app/zone/[slug].tsx:17`.
- Ciclo de importacion latente: el interceptor 401 del cliente necesita leer y
  borrar tokens, y el `AuthProvider` necesita el cliente. Se corta metiendo un
  `src/auth/token-store.ts` **sin React** (solo `expo-secure-store`) del que
  dependen los dos. Por eso el token-store entra en la Fase 2, antes que el
  provider.
- `jest-expo` puede necesitar `transformIgnorePatterns` para el ESM de `msw`.
  Es config de test, no de produccion, pero cuenta como cambio de config: se
  verifica con `unit` **y** con `bundle`.

## Decisiones pendientes (bloqueantes)

**D1 -- Los dos mismatches de `packages/api-client` (M1, M2): se arreglan o se
parchean en el hook.**
El spec 07 acota el write-scope a `apps/mobile/**`. Arreglarlos toca
`packages/api-client`, fuera de ese scope.
_Recomendacion_: **arreglarlos en `packages/api-client`, en una fase propia y
con su commit separado** (Fase 1). Adaptar en el hook dejaria la mentira de tipos
viva para el admin (item 11), que va a consumir `plans.list()` y `auth.logout()`
en pocas horas, y contradice "schemas y contrato una sola vez". El coste es un
commit de 2 lineas + 2 asserts. **Bloquea la Fase 1.**

**D2 -- De donde salen los "avances" cuando los datos son remotos.**
Opciones:

- (a) **Derivar la tarjeta de avance del `Project`**: `title`, `summary`,
  `coverKey`, y el ano de `createdAt`. Una sola request (`GET /v1/projects` para
  el carrusel de la pantalla Zonas; los `projects` embebidos para el detalle).
  Cero cambios en API. El texto mostrado cambia de `update.body` a
  `project.summary` -- **en el seed son identicos** (`seed-data.ts:78-95`), asi
  que la pantalla se ve igual.
- (b) N+1: `useProject(id)` por cada proyecto para leer `updates`. Rechazada:
  5 requests para pintar un carrusel.
- (c) Agregar `updates` al DTO de `/v1/zones/:slug` en la API. Fuera de scope y
  fuera de ola.
  _Recomendacion_: **(a)**. **Bloquea la Fase 5.**

**D3 -- `assetFor()` con una clave desconocida desde la red.**
Hoy lanza (`src/data/zones.ts:32-38`). Opciones: (a) mantener estricto y aceptar
el crash; (b) devolver `undefined` en el camino remoto y que la tarjeta renderice
sin imagen; (c) un asset placeholder nuevo.
_Recomendacion_: **(b)** -- se agrega `assetForKey(key): number | undefined` para
el camino remoto y `assetFor` estricto se conserva para el camino del seed (y su
test, `__tests__/zones-data.test.ts:30-32`, sigue valido). Sin assets nuevos, sin
crash. **Bloquea la Fase 5.**

**D4 -- Dependencias nuevas de MSW: version y alcance.**
Hacen falta `msw` (2.x, la unica que expone `msw/native`),
`react-native-url-polyfill` y `fast-text-encoding`, como `devDependencies` de
`@oneimpact/mobile`. **Las instala el usuario**, no el implementer. Pregunta
abierta: si tras instalar hace falta tocar `metro.config.js` o
`transformIgnorePatterns`, eso amplia el write-scope del spec.
_Recomendacion_: instalar, medir con `expo export`, y **solo si falla** tocar
config, anotandolo como desviacion. **Bloquea la Fase 3.**

**D5 -- Hooks sin endpoint real (no bloqueante, se anota).**
`useDashboard`, `useNotifications`, `useCreateSubscription` y `useFollowProject`
apuntan a rutas que la API **todavia no sirve**: `POST /v1/projects/:id/follow`
no existe (`apps/api/src/modules/projects/controllers/projects.controller.ts`
solo tiene los dos `@Get`), y `subscriptions`/`dashboard`/`notifications` llegan
con 06 y 12. Se implementan igual (el spec los pide) y **solo MSW los sirve**
hasta entonces. Se documenta en el resumen de cierre.

## Principios

Aditivo antes que destructivo. Verde por fase y por su alcance, no por el repo
entero. El spec del vault manda en UI: la migracion de Zonas no puede cambiar un
pixel cuando los datos estan. Los schemas viven una sola vez, en
`packages/shared`. Ningun `fetch` fuera de `api-client`; ningun token fuera de
`expo-secure-store`. Las secciones son presentacionales: los hooks viven en la
pantalla. Sin supresiones nuevas (`@ts-ignore`, `eslint-disable`). Sin debilitar
tests para pasar a verde. Copy en espanol, codigo en ingles, sin emojis.

## Mapa de fases

| Fase | Nombre                                                          | Area       | Impacto    | Shared            | Prisma | Commit sugerido                                                         |
| ---- | --------------------------------------------------------------- | ---------- | ---------- | ----------------- | ------ | ----------------------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                                       | --         | Ninguno    | No                | No     | _(sin commit)_                                                          |
| 1    | Alinear `api-client` con la API real (M1, M2)                   | api-client | Correctivo | No (solo consume) | No     | `fix(api-client): align plans list and logout with the served contract` |
| 2    | Nucleo de datos: cliente, queryClient, keys, token-store, hooks | mobile     | Aditivo    | No                | No     | `feat(mobile): api client, query keys and data hooks`                   |
| 3    | MSW sobre el seed compartido + activacion por flag              | mobile     | Aditivo    | No                | No     | `feat(mobile): msw handlers over the shared seed`                       |
| 4    | Sesion: AuthProvider, guards y grupos de rutas                  | mobile     | Aditivo    | No                | No     | `feat(mobile): auth provider with secure store and route groups`        |
| 5    | Zonas consume hooks (loading / error / vacio)                   | mobile     | Refactor   | No                | No     | `refactor(mobile): zones screens consume query hooks`                   |
| 6    | Cierre: bateria completa + AI log                               | mobile     | Ninguno    | No                | No     | `docs: log ai session mobile-data-layer-and-auth`                       |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar el punto de partida antes de escribir una linea, y que
las tres decisiones bloqueantes esten resueltas.

**Area**: --
**Archivos**: ninguno (solo lectura y comandos)
**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. Confirmar rama y arbol limpio; crear/entrar a `feat/mobile-data-layer-and-auth`.
2. Correr la linea base **antes de tocar nada**:
   `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`.
   Debe salir `[OK]` en los tres. Si algo ya viene rojo desde `main`, se anota y
   **no** se le atribuye a este plan.
3. Reconfirmar con `grep` los dos mismatches M1 y M2 sobre el codigo actual (no
   sobre este documento) y dejar constancia en el resumen de fase.
4. Confirmar que `msw`, `react-native-url-polyfill` y `fast-text-encoding` NO
   estan instalados, y **pedir al usuario que los instale** (D4) antes de la
   Fase 3. La instalacion no la hace el implementer.
5. Cerrar D1, D2 y D3 con el usuario.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
- `git status --short` limpio

**Riesgos**: si `main` no esta verde, todo el plan hereda ruido. Se detecta aca
o no se detecta.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Alinear `api-client` con la API real

**Objetivo**: que el tipo del cliente diga la verdad sobre lo que la API sirve,
antes de que mobile construya nueve hooks encima de una mentira.

**Area**: `packages/api-client` (extension explicita del write-scope del spec,
aprobada en D1)
**Archivos**:

- `packages/api-client/src/resources/plans.ts:7` -- `Plan[]` -> `{ items: Plan[]; total: number }`
- `packages/api-client/src/resources/auth.ts:22-25` -- `logout()` -> `logout(input: { refreshToken: string })` con `body: JSON.stringify(input)`
- `packages/api-client/src/index.test.ts` -- dos asserts nuevos

**Spec**: --
**Shared**: No -- `packages/shared` no cambia. Solo se corrige el tipo declarado
de dos respuestas en `api-client`.
**Prisma**: No
**Eventos**: No

**Acciones**:

1. Corregir M1 en `resources/plans.ts`, citando en un comentario el origen de la
   forma (`listResponseSchema(planSchema)` del DTO de la API).
2. Corregir M2 en `resources/auth.ts`: `logout` recibe `{ refreshToken }` y lo
   serializa. El endpoint responde 204, que `createRequestFn`
   (`packages/api-client/src/http.ts:30`) ya maneja.
3. Agregar al test existente: `plans.list()` resuelve `{items,total}`; `logout`
   manda el `refreshToken` en el body y no revienta con 204.
4. `grep` de consumidores de `plans.list` y `auth.logout` en `apps/**` y
   `packages/**`: hoy no hay ninguno fuera del propio test. Si el grep devuelve
   algo inesperado, **parar y reportar** en vez de arreglarlo de paso.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,lint,unit`
  (cubre `shared`, `ui-tokens` y `api-client`, ver `scripts/dev/quality-check.sh:47-51`)
- Caso negativo cubierto: `logout` sin `refreshToken` no debe compilar.

**Riesgos**: bajo. El unico consumidor es el test del propio paquete
(`apps/admin/src/**` declara la dependencia en `apps/admin/package.json:20` pero
no la importa). Si el usuario decide no aprobar D1, esta fase se salta y las dos
adaptaciones bajan a los hooks de la Fase 2, con una nota de deuda.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `fix(api-client): align plans list and logout with the served contract`

---

## Fase 2 -- Nucleo de datos: cliente, queryClient, keys y hooks

**Objetivo**: `src/api` completo y tipado, con refresh 401, sin MSW todavia y
sin que ninguna pantalla lo consuma aun. Aditivo puro: al final de esta fase la
app se comporta exactamente igual que antes.

**Area**: mobile
**Archivos** (todos nuevos salvo el ultimo):

- `apps/mobile/src/auth/token-store.ts` -- wrapper de `expo-secure-store`
  (`getAccessToken`, `getRefreshToken`, `saveTokens`, `clearTokens`). **Sin
  React**: lo usan el cliente y el provider, y es lo que corta el ciclo de
  importacion descrito en Contexto #8.
- `apps/mobile/src/api/client.ts` -- `createApiClient` de
  `@oneimpact/api-client` con `baseUrl` de `EXPO_PUBLIC_API_URL` y
  `getToken: token-store.getAccessToken`; encima, el interceptor 401: ante
  `ApiError` con `status === 401` llama `auth.refresh` **una sola vez**, guarda
  los tokens nuevos y reintenta; si el refresh falla, `clearTokens` y notifica
  al listener de sesion.
- `apps/mobile/src/api/queryClient.ts` -- `QueryClient` con `staleTime` y
  `retry` explicitos (no reintentar un 401/403: ya lo maneja el interceptor).
- `apps/mobile/src/api/hooks/keys.ts` -- `queryKeys` centralizadas.
- `apps/mobile/src/api/hooks/` -- `usePlans`, `useZones`, `useZone(slug)`,
  `useProjects(filters)`, `useProject(id)`, `useMe`, `useDashboard`,
  `useNotifications`; mutaciones `useRegister`, `useLogin`,
  `useCreateSubscription`, `useFollowProject` con invalidacion de las keys que
  correspondan.
- `apps/mobile/src/api/index.ts` -- barrel.
- `apps/mobile/app/_layout.tsx:14,32` -- usar el `queryClient` de
  `src/api/queryClient.ts` en lugar del creado inline. Unico cambio en esta fase.

**Spec**: vault `arquitectura-mobile.md:65-69` ("Flujo de datos") y
`arquitectura-mobile.md:41` (refresh automatico en el cliente).
**Shared**: No -- solo consume tipos.
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `token-store.ts` primero: es la dependencia de todo lo demas.
2. `client.ts` con el interceptor. La regla del "una sola vez": un flag por
   request, no un contador global; dos requests concurrentes que reciben 401 no
   pueden disparar dos refresh -- se comparte la promesa en vuelo.
3. `queryClient.ts` y mover el montaje en `_layout.tsx`.
4. `keys.ts` y luego los hooks, **uno por invocacion del implementer**. Cada hook
   devuelve el tipo de `packages/shared`, sin remapear ni "aplanar" nada.
5. Test de comportamiento del interceptor con `fetch` mockeado: 401 -> refresh ->
   reintento exitoso; y 401 -> refresh fallido -> `clearTokens` + propagacion del
   error. Sin red real.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "api"`
- Casos negativos obligatorios (zona de riesgo auth): refresh que falla no deja
  tokens en secure-store; un 403 **no** dispara refresh; el reintento ocurre una
  sola vez aunque el segundo intento vuelva 401.
- Pendiente manual: ninguno -- esta fase no cambia nada visible.

**Riesgos**: el ciclo `client -> auth -> client`. Si aparece pese al
token-store, es senal de que algo de React se colo en `token-store.ts`.
`expo-secure-store` no funciona en `react-native-web`; el target es Android/iOS,
pero si `expo export --platform web` entra al pipeline mas adelante hay que
guardarlo con `Platform.OS`.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(mobile): api client, query keys and data hooks`

---

## Fase 3 -- MSW sobre el seed compartido

**Objetivo**: que la app funcione entera sin API. Es el seguro de la demo del
lunes y lo que habilita 08 y 09 en paralelo con 06.

**Area**: mobile
**Archivos**:

- `apps/mobile/package.json` -- las tres devDependencies de D4. **Las instala el
  usuario antes de arrancar la fase**; el implementer no corre `pnpm add`.
- `apps/mobile/src/api/msw/seed-fixtures.ts` -- mapper seed -> contrato:
  sintetiza `id` estables para zonas (`zone-<slug>`), proyectos
  (`project-<slug>`) y `zoneId`/`createdAt`, porque `SeedZone` y `SeedProject`
  los omiten (`packages/shared/src/seed-data.ts:5-18`).
- `apps/mobile/src/api/msw/state.ts` -- estado en memoria de la sesion simulada:
  usuarios registrados, suscripcion activa, follows.
- `apps/mobile/src/api/msw/handlers.ts` -- **todo** `API_PATHS`
  (`packages/shared/src/api-paths.ts:5-33`): auth (register/login/refresh/logout),
  `me`, `plans`, `zones` (lista y detalle), `projects` (lista con filtros
  `zoneSlug`/`status`, detalle, follow/unfollow), `subscriptions`, `dashboard`,
  `notifications`, `admin`.
- `apps/mobile/src/api/msw/server.ts` -- `setupServer` de `msw/native` +
  polyfills.
- `apps/mobile/app/_layout.tsx` -- arranque condicional: `EXPO_PUBLIC_API_URL`
  vacio **o** `EXPO_PUBLIC_USE_MSW=1`.
- `apps/mobile/.env.example` -- documentar `EXPO_PUBLIC_USE_MSW`.

**Spec**: vault `arquitectura-mobile.md:69` ("Si la API no esta lista:
`EXPO_PUBLIC_API_URL` vacio -> MSW con el seed -> la UI funciona igual").
**Shared**: No -- consume `SEED_ZONES`, `SEED_PROJECTS`, `SEED_PLANS` y
`API_PATHS`.
**Prisma**: No. El seed de la API no se toca: **es el mismo dataset**, leido
desde `packages/shared`.
**Eventos**: No

**Acciones**:

1. `seed-fixtures.ts` y su test: las 5 zonas salen con `id` unico y estable y el
   mismo orden que `SEED_ZONES`.
2. `state.ts` con las reglas simuladas: `last4 === '0000'` -> **402** en
   `POST /v1/subscriptions` (invariante del pago simulado, replicada del lado
   cliente); login con credenciales desconocidas -> 401; `GET /me` sin
   `Authorization` -> 401.
3. `handlers.ts`, agrupado por recurso. **El handler nunca inventa una forma**:
   se tipa contra los tipos de `packages/shared`, que es la invariante que el
   spec pide verificar con un test.
4. `server.ts` + polyfills, y el arranque condicional en `_layout.tsx`.
5. Test del contrato: `GET /v1/zones` devuelve 5 items y el objeto satisface
   `zoneSchema` (`packages/shared/src/schemas/catalog.ts:18-25`) -- validado con
   el propio zod, no con un `expect` a mano. Ese test **es** la invariante "MSW y
   API devuelven la misma forma".

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "api"`
- `bash scripts/dev/quality-check.sh --scope mobile --only bundle` -- **obligatorio
  aca**: es la fase que mete dependencias nuevas con polyfills y potencialmente
  toca config de bundling (zona de riesgo #3).
- Casos negativos: tarjeta `0000` -> 402; `GET /me` sin token -> 401; login
  invalido -> 401.
- Pendiente manual: arrancar Expo Go con `EXPO_PUBLIC_API_URL` vacio y navegar
  Inicio -> Zonas sin errores en consola.

**Riesgos**: es la fase con mas superficie de fallo. `msw/native` arrastra APIs
de Node que Hermes no tiene; si los polyfills declarados no alcanzan, aparece en
`expo export` (no en Jest, que corre en Node y lo tapa). Por eso el paso `bundle`
es parte del gate y no del cierre. Si hay que tocar `metro.config.js` o
`transformIgnorePatterns`, es una desviacion del write-scope: se anota y se
reporta, no se hace en silencio.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(mobile): msw handlers over the shared seed`

---

## Fase 4 -- Sesion: AuthProvider, guards y grupos de rutas

**Objetivo**: sesion persistente, rol revalidado contra el servidor y el switch
`(tabs)` / `(app)`. Sin UI de login (eso es 09): esta fase entrega el mecanismo,
no la pantalla.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/auth/AuthProvider.tsx` -- context con `user: UserProfile | null`,
  `status: 'loading' | 'guest' | 'authed'`, `signIn`, `signUp`, `signOut`. Al
  montar: si hay token en secure-store -> `GET /me`; si responde, `authed` con el
  `role` **del servidor**; si falla, `clearTokens` y `guest`.
- `apps/mobile/src/auth/useAuth.ts`
- `apps/mobile/src/auth/useRequireAuth.ts` -- `useRequireAuth(returnTo)` redirige
  a login guardando el destino.
- `apps/mobile/src/auth/useRequireRole.ts` -- `useRequireRole('ADMIN')` usando
  `Role` de `packages/shared/src/enums.ts:1-2`.
- `apps/mobile/src/auth/index.ts`
- `apps/mobile/app/_layout.tsx` -- montar `AuthProvider` dentro de
  `QueryClientProvider`; declarar `Stack.Screen name="(app)"`; **no renderizar
  nada** mientras `status === 'loading'` (misma disciplina que las fuentes,
  `app/_layout.tsx:25-27`).
- `apps/mobile/app/(app)/_layout.tsx` -- guard del grupo protegido.
- `apps/mobile/app/(app)/dashboard.tsx` -- placeholder minimo, explicitamente
  marcado para que el item 10 lo reemplace.

**Spec**: vault `arquitectura-mobile.md:36-42` ("Sesion y roles") y
`arquitectura-mobile.md:29-33` (grupo `(app)`).
**Shared**: No -- consume `UserProfile` y `Role`.
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `AuthProvider` con la maquina de estados de tres valores. `signIn` guarda
   tokens **antes** de setear el usuario, para que un refetch inmediato ya lleve
   `Authorization`. `signOut` llama `auth.logout({ refreshToken })` (posible
   gracias a la Fase 1), limpia secure-store y hace `queryClient.clear()`.
2. Conectar el listener que el interceptor de la Fase 2 dejo preparado: refresh
   fallido -> el provider pasa a `guest`.
3. Hooks `useAuth`, `useRequireAuth`, `useRequireRole`.
4. `_layout.tsx` y el grupo `(app)` con su guard y el `dashboard.tsx`
   placeholder. Las rutas publicas siguen accesibles con sesion
   (`arquitectura-mobile.md:40`): el guard **no** expulsa de `(tabs)`.
5. Tests de `useAuth` con `expo-secure-store` mockeado: `signIn` guarda el token;
   `signOut` lo borra; arranque con token valido -> `authed` con el rol de
   `GET /me`; arranque con token invalido -> `guest` y secure-store vacio.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "auth"`
- Casos negativos obligatorios (zona de riesgo auth): `GET /me` -> 401 al
  arrancar deja `guest` y sin tokens; `useRequireRole('ADMIN')` con un usuario
  `USER` no da acceso; el `role` **nunca** se lee de un estado local escribible
  ni se persiste en secure-store como fuente de verdad -- viene de `GET /me`.
- Pendiente manual: en Expo Go, `signIn` simulado contra MSW redirige a `(app)`;
  matar y reabrir la app mantiene la sesion; `signOut` vuelve a `(tabs)`.

**Riesgos**: pantalla en blanco si `status === 'loading'` no termina nunca
(secure-store que no resuelve). El guard de `(app)` puede pelearse con la
redireccion inicial de `_layout` y provocar un bucle de navegacion: una sola
capa decide el destino inicial, la otra solo bloquea. `typedRoutes` puede no
conocer `/dashboard` hasta que Metro regenere tipos (Contexto #8).

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(mobile): auth provider with secure store and route groups`

---

## Fase 5 -- Zonas consume hooks

**Objetivo**: cambiar la fuente de datos de Zonas y del detalle **sin cambiar un
pixel** cuando los datos estan, y agregar los estados que antes no existian
porque los datos eran sincronos.

**Area**: mobile
**Archivos**:

- `apps/mobile/src/data/zones.ts:57-89` -- se van las derivaciones `zones`,
  `advances`, `getZone`, `advancesByZone`, `projectsByZone`. **Se quedan**
  `ASSETS`, `assetFor` y todo el copy (`zonesScreen:99-107`,
  `zoneDetail:119-128`): es contenido de marketing, no dato remoto. Se agrega
  `assetForKey` no estricto (D3) y el mapper `Project -> AdvanceView` (D2).
- `apps/mobile/src/features/zones/ZonesList.tsx:4,15` -- recibe `zones: ZoneView[]`
  por props; deja de importar el array de modulo.
- `apps/mobile/src/features/zones/AdvancesCarousel.tsx:4,37` -- recibe
  `advances: AdvanceView[]` por props.
- `apps/mobile/app/(tabs)/zones.tsx:12-14` -- llama `useZones()` y
  `useProjects()`, y pasa los datos hacia abajo.
- `apps/mobile/app/zone/[slug].tsx:6,14,30` -- `useZone(slug)`; los avances
  salen de `zone.projects` (D2); `notFound` deja de ser "no esta en el array" y
  pasa a ser el 404 del servidor (`ZONE_NOT_FOUND`,
  `apps/api/src/modules/catalog/application/catalog.service.ts:38`).
- `apps/mobile/src/features/zones/ZonesSkeleton.tsx` (nuevo) -- esqueleto crema.
- `apps/mobile/src/features/zones/ZonesError.tsx` (nuevo) -- tarjeta de error con
  reintento, copy en espanol.
- `apps/mobile/__tests__/zones-data.test.ts` y
  `apps/mobile/__tests__/zone-detail.test.tsx` -- actualizados a la nueva forma.

**Spec**: vault `02-Analisis-Visual/pantallas/zonas.md` secciones 1-3 y "Detalle
de zona" (ya implementadas en el item 03: **esta fase no reinterpreta el spec,
solo cambia de donde vienen los datos**). Estados nuevos segun
`60-design-system.md`: fondo crema, pildoras, tokens; el vacio ya existe
(`ZoneEmptyAdvances.tsx`) y se conserva tal cual.

**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. Aplicar D3: `assetForKey` y el mapper de avances. `assetFor` estricto se
   conserva -- su test (`__tests__/zones-data.test.ts:30-32`) sigue pasando sin
   tocarlo.
2. Volver presentacionales `ZonesList` y `AdvancesCarousel` (props). Verificar
   con grep que nadie mas las usa: hoy solo `app/(tabs)/zones.tsx:13-14`.
3. `ZonesSkeleton` y `ZonesError`.
4. Migrar `app/(tabs)/zones.tsx` y `app/zone/[slug].tsx`.
5. Actualizar los dos tests: los que probaban el array de modulo pasan a probar
   el mapper puro (`Project -> AdvanceView`); `zone-detail.test.tsx` mockea el
   hook en vez del modulo de datos. **No se borra ningun assert para pasar a
   verde**: se traduce a la nueva forma. Agregar el caso que antes no existia:
   error de red -> se ve `ZonesError`, no una pantalla vacia.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit`
  (sin `--filter`: esta fase toca tests fuera de `api|auth`)
- Casos: zona inexistente -> 404 -> "Zona no encontrada"; zona sin proyectos
  (`patagonia`) -> `ZoneEmptyAdvances`, **no** un spinner eterno; error de red ->
  `ZonesError` con reintento que efectivamente refetchea.
- **Pendiente manual (obligatorio, es fidelidad visual)**: en Expo Go, comparar
  Zonas y detalle contra las capturas del item 03. Verificar que con datos
  cargados el render es **identico**: mismo orden 1..5, mismas imagenes, misma
  tipografia `font-bold` (700, no 900), mismo carrusel forest con dots. Verificar
  el skeleton y el error forzando `EXPO_PUBLIC_API_URL` a un puerto muerto.

**Riesgos**: el mayor riesgo del plan es una regresion visual silenciosa -- los
tests no la ven. De ahi que la verificacion manual sea obligatoria y no
opcional. Segundo riesgo: `zones` estaba ordenado por `order`
(`src/data/zones.ts:57-58`); el orden ahora lo decide la API/MSW y hay que
comprobarlo, no asumirlo.

CHECKPOINT -- Detente aca. No inicies la Fase 6 sin aprobacion.
**Commit sugerido**: `refactor(mobile): zones screens consume query hooks`

---

## Fase 6 -- Cierre: bateria completa y AI log

**Objetivo**: dejar el repo entero verde y registrar la sesion, que es
entregable de la prueba.

**Area**: mobile (verificacion) + docs
**Archivos**:

- `docs/ai-workflow.md` -- entrada nueva via `/ai-log`
- `.claude/roadmap/ROADMAP.md` -- marcar el item 07 como hecho
- `.claude/plans/README.md` -- fila del plan en el indice, con el estado
- Este archivo -- header `> **Estado**: ejecutado en <rama> (<hash>..<hash>)`

**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` -- **la unica vez en el plan**.
2. `bash scripts/dev/quality-check.sh --scope mobile --only bundle`.
3. `/review-pr` sobre la rama.
4. `/ai-log` con lo pedido, lo entregado, lo revisado y lo ajustado a mano.
5. Anotar explicitamente en el resumen: (a) los hooks de D5 que solo sirve MSW
   porque su endpoint no existe todavia; (b) el resultado de la verificacion
   visual manual de la Fase 5; (c) cualquier desviacion de write-scope que haya
   hecho falta (D4).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope all` -> todo `[OK]`
  (`e2e` de api quedara `[SKIP]` si Postgres no esta arriba: `pnpm db:up` si se
  quiere el verde completo)
- Pendiente manual: confirmado y anotado el arranque con API y sin API.

**Riesgos**: `--scope all` puede sacar a la luz un rojo de otro workspace ajeno a
este plan (`api`, `admin`). Se reporta y se atribuye correctamente; no se arregla
dentro de esta rama salvo que lo haya causado este plan.

CHECKPOINT -- Fin del plan.
**Commit sugerido**: `docs: log ai session mobile-data-layer-and-auth`

---

## Criterios de aceptacion del spec, mapeados a fases

| Criterio del spec 07                                                             | Fase que lo cumple               | Como se comprueba                                                    |
| -------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| Con `EXPO_PUBLIC_API_URL` vacio la app navega Zonas y detalle con datos del seed | 3 + 5                            | manual en Expo Go + test de handlers                                 |
| Con la API local arriba, los mismos datos salen de Postgres                      | 5                                | manual con IP LAN                                                    |
| Test: `signIn` guarda token, `signOut` lo borra, 401 dispara refresh             | 2 (refresh) + 4 (signIn/signOut) | `--filter "api"` y `--filter "auth"`                                 |
| Test: handler MSW de `/v1/zones` devuelve 5                                      | 3                                | test de contrato validado con `zoneSchema`                           |
| Ningun `fetch` fuera de `api-client`                                             | 2                                | grep en la review; `src/api/client.ts` solo compone                  |
| Ningun token fuera de secure-store                                               | 2 + 4                            | `token-store.ts` es el unico modulo que importa `expo-secure-store`  |
| MSW y API devuelven la misma forma                                               | 3                                | el handler se tipa contra `packages/shared` y el test valida con zod |
