# Plan -- Admin: metricas, usuarios, suscripciones, zonas y outbox (por fases, checkpoint por fase)

> **Fecha**: 2026-08-24
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/13-admin-metrics-users-subscriptions.md`
> **Base**: vault `01-Tecnologia-Arquitectura/admin-web.md` (seccion "Rutas");
> reglas `40-admin-conventions.md`, `50-testing-and-verification.md`,
> `60-design-system.md`; ADR `docs/adr/002-admin-ui-primitives.md` (primitivos
> propios, no shadcn) y `003-outbox-and-queue-transport.md`. Planes previos:
> `.claude/plans/20260823-admin-auth-and-projects.plan.md` (item 11, mergeado en
> `45e5b65`) y `.claude/plans/20260824-api-dashboard-metrics-and-outbox.plan.md`
> (item 12, mergeado en `3f6853a`)
> **Areas**: admin + api + shared (`packages/shared`, `packages/api-client`) +
> mobile (solo el handler MSW de metricas, ver D1)
> **Contrato shared tocado**: **Si**. `adminMetricsSchema` (un campo nuevo, D2),
> `userProfileSchema` (un campo opcional, D4), dos schemas nuevos para
> suscripciones de admin y dos para escritura de zonas, y 3 rutas en
> `api-paths.ts`. Consumidores verificados por grep en la Fase 0.
> **Schema Prisma tocado**: **No**. Ni migracion ni cambios de seed: todo lo que
> hace falta ya esta modelado (`Subscription.payments`, `Zone`, `User.createdAt`)
> **Eventos**: No emite ni escucha eventos nuevos. La pantalla de outbox **lee**
> `OutboxEvent`, que es infraestructura de entrega, no dominio
> (`docs/adr/003-outbox-and-queue-transport.md`)
> **Zonas de riesgo**: **auth y roles** -- cinco endpoints y cinco pantallas solo
> para ADMIN, con casos negativos 401/403 obligatorios; y **el cambio de rol**,
> que es la unica escritura del producto capaz de dejar sin acceso al propio
> operador. Sin pago simulado (solo se **leen** pagos ya persistidos: `brand`,
> `last4`, nunca un PAN). Sin config de Metro
> **Fase del roadmap**: **Fase 2** (25-31 ago). Ola 7. No entra en la entrega del
> lunes 24; el corte minimo de esa entrega ya se cerro con el item 11
> **Como ejecutar**: `/run-plan-worktree admin-metrics-users-subscriptions`
> (rama `feat/admin-metrics-users-subscriptions`, como indica el spec)

## Objetivo

Completar `apps/admin`: dashboard de metricas con graficos, gestion de usuarios y
roles, suscripciones con sus pagos simulados, CRUD de zonas y visor del outbox.
Las cuatro paginas que hoy son placeholders pasan a ser reales, y el panel deja
de ser "proyectos y nada mas".

El visor de outbox no es un extra: es la **ventana a la arquitectura a eventos**
para la demo. Es lo unico del producto que muestra que `subscription.activated`
existe, se entrega y se reintenta.

## Contexto y hallazgos del analisis

### 1. Lo que el item 12 ya dejo servido

- `GET /v1/admin/metrics` -- `AdminMetricsController`
  (`apps/api/src/modules/impact/controllers/admin-metrics.controller.ts:23`),
  `@Roles(Role.ADMIN)` a nivel de clase, con cache en memoria de 30 s en
  `AdminMetricsService` (`admin-metrics.service.ts:6`).
- `GET /v1/admin/outbox` -- `OutboxAdminController`
  (`apps/api/src/infra/events/controllers/outbox-admin.controller.ts:28`).
  Devuelve un **array plano** de los ultimos 50, no el sobre `{items,total}`, y
  el `status` es **derivado**, nunca almacenado (`:50-58`).
- Los schemas viven en `packages/shared/src/schemas/admin.ts`:
  `adminMetricsSchema` (`:23`) y `outboxEventSchema` (`:6`).

`GET /v1/admin/users` y `PATCH /v1/admin/users/:id/role` ya existian desde el
item 05 (`apps/api/src/modules/users/controllers/admin-users.controller.ts`).

### 2. Hay DOS tipos `AdminMetrics` y no coinciden

Este es el hallazgo que ordena la Fase 1.

| Origen                                                                   | Campos                                                                                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/schemas/admin.ts:23` (**lo que la API sirve**)      | `users`, `activeSubscriptionsByPlan`, `mrrSimulated`, `projectsByStatus`, `updatesLast30Days`, `avgProgressByZone`, `generatedAt` |
| `packages/api-client/src/resources/admin.ts:6` (interfaz escrita a mano) | `users`, `activeSubscriptions`, `simulatedMrr`, `projectsByStatus`                                                                |

La de `api-client` se escribio en el item 07, cuando el endpoint **todavia no
existia**; su propio comentario lo dice ("Not part of the shared REST contract
yet"). El item 12 sirvio el endpoint contra `adminMetricsSchema` y **nadie
volvio a esa interfaz**.

Consecuencias reales, no teoricas:

- `browserApi.admin.metrics()` del admin devolveria el tipo equivocado: dos
  campos con **otro nombre** y tres campos que el compilador no conoce. El
  dashboard de la Fase 3 no puede escribirse contra eso.
- **MSW de mobile sirve la forma vieja**: `apps/mobile/src/api/msw/admin-state.ts:99`
  importa `AdminMetrics` de `api-client` y construye `{activeSubscriptions,
simulatedMrr}`. O sea que hoy MSW y la API **no devuelven lo mismo**, que es
  exactamente lo que la regla de MSW prohibe.
- No hay pantalla rota todavia por pura suerte: `apps/mobile/app/(app)/admin.tsx`
  no consume metricas (verificado por grep). El item 13 es el primer consumidor.

`api-client` tampoco tiene metodo para `admin.outbox`, aunque la ruta ya este en
`API_PATHS.admin.outbox` (`packages/shared/src/api-paths.ts:34`).

### 3. El grafico de linea que pide el spec no tiene datos que graficar

Doble problema, y el segundo es peor que el primero:

1. **No hay serie.** `updatesLast30Days` es **un numero**
   (`packages/shared/src/schemas/admin.ts:34`), producido por un `count`
   (`admin-metrics.repository.ts:80-82`). Un grafico de linea necesita una serie
   temporal.
2. **Y contra el seed el numero es cero.** Los cinco `publishedAt` del seed son
   `2026-02-10`, `2026-03-18`, `2026-04-22`, `2026-05-30` y `2026-06-15`
   (`packages/shared/src/seed-data.ts:94,119,144,169,194`). Hoy es
   **2026-08-24**: el mas reciente tiene **70 dias**. La ventana de 30 dias esta
   vacia, y lo seguira estando cada dia que pase.

Ver **D2**.

### 4. El criterio de aceptacion "< 30 s" no se puede cumplir con el cache actual

El spec pide que una suscripcion creada desde mobile aparezca en el tile "en
menos de 30 s", y pide refresco de 30 s en el cliente. Pero
`AdminMetricsService` cachea la respuesta **30 s en memoria**
(`admin-metrics.service.ts:6,28-32`), y el `QueryClient` del admin ya tiene
`staleTime` de 30 s (`apps/admin/src/lib/query-provider.tsx:40`).

30 s de poll + 30 s de cache = **hasta 60 s** en el peor caso. Ver **D3**.

### 5. Los dos endpoints que el spec manda agregar

- **`GET /v1/admin/subscriptions`**: no existe. El modulo `subscriptions` solo
  tiene `SubscriptionsController` con las rutas de usuario
  (`apps/api/src/modules/subscriptions/controllers/subscriptions.controller.ts`).
  La tabla necesita usuario + plan + **pagos**, y `Payment` es dominio de
  `payments`. **No hace falta un ADR nuevo**: `payments` ya exporta
  `PaymentsService` y `subscriptions` ya lo inyecta -- es la excepcion numero 2
  sancionada en `.claude/rules/30-api-event-driven.md`
  (`apps/api/src/modules/payments/payments.module.ts:43`). Se le agrega un metodo
  de lectura y listo.
- **`POST /v1/zones` y `PATCH /v1/zones/:slug`**: no existen. `catalog` es hoy
  solo lectura (`zones.controller.ts`), y su `CatalogService` esta exportado
  como catalogo publico (excepcion numero 1 de la misma regla). Escribir zonas es
  aditivo: un controller nuevo con `@Roles('ADMIN')`, **sin** heredar el
  `@Public()` de clase del controller de lectura -- el mismo patron que
  `AdminProjectsController` usa para convivir con `ProjectsController`
  (`admin-projects.controller.ts:20-23`).

### 6. La tabla de usuarios pide dos columnas que el contrato no tiene

El spec quiere `nombre, email, rol, creado, suscripcion activa`. Pero
`userProfileSchema` es `{id, email, name, role}` y nada mas
(`packages/shared/src/schemas/auth.ts:17-22`). El dato **si existe** en Prisma
(`User.createdAt`, `schema.prisma`), solo que no se expone. Ver **D4**.

### 7. Lo que el item 11 dejo listo para reusar (no reinventar nada de esto)

| Necesito                                       | Ya existe                                                                                                               | Archivo                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Primitivos de UI con los tokens                | `Table`, `Badge`, `Button`, `Input`, `Select`, `Textarea`, `Label`, `FieldError`, `EmptyState`, `ProgressBar`, `Slider` | `apps/admin/src/components/ui/`                                    |
| Salida unica del navegador a la API            | `browserApi` sobre `/api/gateway`, que adjunta la cookie httpOnly                                                       | `src/lib/api-browser.ts`, `src/app/api/gateway/[...path]/route.ts` |
| Fetch desde Server Components                  | `serverApi` con la cookie                                                                                               | `src/lib/api-server.ts`                                            |
| Query keys jerarquicas                         | `queryKeys`                                                                                                             | `src/lib/query-keys.ts:17-27`                                      |
| Provider con politica de reintentos por status | `query-provider.tsx`                                                                                                    | `src/lib/query-provider.tsx:22-45`                                 |
| Patron de hooks de escritura + invalidacion    | `useCreateProject` y compania                                                                                           | `src/features/projects/hooks.ts`                                   |
| Navegacion lateral                             | `Sidebar` con las 5 rutas ya declaradas                                                                                 | `src/components/layout/Sidebar.tsx`                                |
| Firma de subida (para la imagen de zona)       | `upload.ts` con el caso `simulated: true`                                                                               | `src/features/projects/upload.ts`                                  |
| Playwright con sesion unica                    | `global-setup.ts` + proyectos `chromium-anon` / `chromium-admin`                                                        | `apps/admin/playwright.config.ts`                                  |

**El default de Playwright es la sesion de admin**: un spec nuevo en `e2e/` la
recibe salvo que se agregue a `ANONYMOUS_SPECS` (`playwright.config.ts:13`). Los
dos specs de este plan van autenticados, o sea que **no hay que tocar el
config**.

`src/features/zones/hooks.ts` ya tiene `useZones()` de lectura, con un comentario
que dice literalmente que `/zones` sigue siendo placeholder "del item 13"
(`:22`). Esta fase lo cumple.

### 8. Recharts no esta instalado

`apps/admin/package.json` no lo tiene. El vault lo nombra en el stack
(`admin-web.md`, "Stack") y el spec 13 obliga a **cargar la skill `dataviz`
antes de escribir el primer grafico**. Ver **D6**.

### 9. El ROADMAP esta desactualizado en dos filas

`.claude/roadmap/ROADMAP.md` marca 10 y 12 como `pendiente`, pero los dos estan
mergeados en `main` (`876ce6f` y `3f6853a`). **El item 13 depende de 12**, asi que
la fila importa: leida al pie de la letra diria que este plan no puede arrancar.
Se corrige en la Fase 0, que es lectura salvo por esa linea.

## Decisiones resueltas

### D1 -- El `AdminMetrics` de `api-client` se borra, no se actualiza

Hallazgo 2. Tener dos tipos con el mismo nombre y distinta forma es la causa
raiz; sincronizarlos a mano solo aplaza el proximo desfase.

**RESUELTA**: `packages/api-client/src/resources/admin.ts` deja de declarar la
interfaz y pasa a importar `AdminMetrics` de `@oneimpact/shared`, como ya hacen
todos los demas recursos del cliente. Se agrega `outbox()`. `packages/api-client/src/index.ts:16`
deja de re-exportar un tipo propio.

Efecto colateral obligatorio en la misma fase: `apps/mobile/src/api/msw/admin-state.ts:99`
pasa a construir la forma real, y su comentario de "la API no sirve este endpoint
todavia" se borra porque es falso desde el item 12. **Un handler de MSW que no
espeja el contrato es un hallazgo bloqueante**, no deuda.

Consumidores verificados por grep (Fase 0 los vuelve a verificar):
`packages/api-client/src/{index.ts,resources/admin.ts}`,
`apps/mobile/src/api/msw/{admin-state.ts,handlers.ts}`,
`apps/mobile/__tests__/msw-handlers.test.ts`. Ninguna pantalla de mobile lo usa.

### D2 -- El grafico de linea: se agrega la serie y se asume que el seed la deja vacia

Hallazgo 3, que tiene dos mitades y se resuelven distinto.

**Mitad 1, la serie: RESUELTA agregandola.** `adminMetricsSchema` gana
`updatesByDay: { date: string; count: number }[]`, con **un punto por dia de la
ventana, incluidos los dias en cero** -- si solo se devuelven los dias con
avances, la linea miente sobre la distribucion. Es un `groupBy` sobre
`ProjectUpdate.publishedAt` en `AdminMetricsRepository`, al lado del `count` que
ya existe (`:80-82`). `updatesLast30Days` **se conserva**: alimenta un tile y es
lo que asertan los e2e del item 12; no se rompe nada.

**Mitad 2, el seed vacio: NO se toca el seed.** Contra el dataset de la demo la
serie son 30 ceros, y eso seguira siendo cierto manana. Cambiar `SEED_PROJECTS`
obliga a re-seedear API, e2e y MSW, y es territorio del item 01.

Lo que se hace en su lugar: el grafico tiene **estado vacio explicito** ("Sin
avances en los ultimos 30 dias"), y la demo genera el dato en vivo -- publicar un
avance desde el propio admin, que el item 11 ya sabe hacer
(`src/features/projects/PublishUpdateForm.tsx`). Eso convierte el hueco en la
mejor demostracion posible del recorrido: publicar un avance y ver moverse el
grafico y el tile.

**Se anota como pendiente manual, no como test**: ningun assert automatico puede
depender de "hoy menos 30 dias" sin volverse intermitente.

### D3 -- El "< 30 s": se baja el cache del servidor, no se reformula el criterio

Hallazgo 4. Con 30 s de cache y 30 s de poll, el peor caso son 60 s y el criterio
del spec es inalcanzable.

**RESUELTA**: `CACHE_MS` de `AdminMetricsService` baja de 30 s a **10 s**, y el
`refetchInterval` de `useMetrics` queda en **15 s**. Peor caso 25 s, que si
cumple. Es una constante, la fase que la toca ya esta en `apps/api`, y el motivo
del cache (que la agregacion no se recalcule en cada pintada) se conserva
entero: 10 s siguen absorbiendo cualquier rafaga de refrescos.

`refetchInterval` se pone **explicito en el hook**, no en el provider: el
`staleTime` global de 30 s es correcto para zonas y proyectos, y no hay razon
para volver todo el panel mas nervioso por una pantalla.

Descartada: dejar todo como esta y reescribir el criterio a "< 60 s". El criterio
es del spec y se puede cumplir con un cambio de una linea; reescribirlo seria
bajar la vara en vez de subir el producto.

### D4 -- `createdAt` se agrega a `userProfileSchema`; la suscripcion se cruza en el cliente

Hallazgo 6, dos columnas y dos respuestas distintas.

**`creado`: RESUELTA agregando `createdAt` a `userProfileSchema`** como campo
requerido, mapeado desde `User.createdAt`, que ya existe en Prisma. Es aditivo
para todo consumidor que lo ignore. Consumidores a revisar en la misma fase:
`GET /me` y `PATCH /admin/users/:id/role` de la API, el `AuthProvider` de mobile,
el estado de MSW y el perfil de mobile (item 10). El mapper de `users` es el
unico sitio donde hay que producirlo.

**`suscripcion activa`: RESUELTA cruzando en el cliente.** La pagina de usuarios
ya va a tener `GET /v1/admin/subscriptions` disponible (Fase 2): se construye un
`Map<userId, Subscription>` y se pinta el badge. Dos peticiones cacheadas, cero
N+1, y **cero cambios de contrato** para un dato que ya viaja.

Descartada: un `adminUserSchema` separado con la suscripcion embebida. Duplica el
tipo de usuario en el contrato para ahorrarse un `Map` de tres lineas.

### D5 -- `GET /v1/admin/subscriptions` vive en `subscriptions` y usa la excepcion ya sancionada

Hallazgo 5. La tabla necesita pagos, que son de `payments`.

**RESUELTA**: el endpoint vive en `subscriptions`, como dice el spec, en un
`AdminSubscriptionsController` propio con `@Roles('ADMIN')`. Los pagos se piden a
`PaymentsService`, que `PaymentsModule` **ya exporta** y `SubscriptionsService`
**ya inyecta** -- la excepcion numero 2 de `.claude/rules/30-api-event-driven.md`,
sancionada en el item 06. Se le agrega un metodo de lectura por lote
(`listBySubscriptionIds`), no uno por fila.

`user` y `plan` son relaciones de `Subscription` en el propio modulo: los resuelve
su repositorio con un `include`, sin cruzar nada.

**No se agrega ninguna excepcion nueva a la regla.** Si durante la ejecucion
apareciera la tentacion de importar `UsersService`, es un hallazgo bloqueante: el
dato sale del `include`.

### D6 -- PREREQUISITO: instalar Recharts, y cargar la skill `dataviz` antes de graficar

**No es una decision, son dos acciones**, y la segunda la manda el spec 13
literalmente.

1. Antes de la **Fase 3**:
   `pnpm --filter @oneimpact/admin add recharts`. Convencion heredada de los items
   07 y 09: el implementer no corre `pnpm add`.
2. **La skill `dataviz` se carga antes de escribir la primera linea de Recharts.**
   No es opcional ni decorativo: fija paleta, formas y reglas de leyenda/eje, y
   este panel tiene que verse como el producto, no como un dashboard generico.
   Los colores salen de `packages/ui-tokens` via `globals.css`, **nunca** de la
   paleta por defecto de Recharts.

### D7 -- El cambio de rol necesita una barrera que el spec no pide

No es una pregunta abierta, es un agujero: `PATCH /admin/users/:id/role` deja que
un ADMIN se degrade **a si mismo** a USER, y en cuanto lo hace el middleware lo
manda a `/403` y pierde el panel. Con un solo admin en el seed, eso es un
bloqueo autoinfligido sin salida por UI.

**RESUELTA en el cliente, no en la API**: el dialogo de confirmacion nombra al
usuario y el rol destino, y la fila del **propio usuario** no ofrece el cambio.
Se hace en el admin y no en el servidor porque `GET /me` ya le dice al panel
quien es, y meter la regla en la API sin que el spec la pida es cambiar dominio
de tapadita.

**Se anota como PREGUNTA ABIERTA** para el item 14: si el producto quiere
garantizar "siempre al menos un ADMIN", eso es una invariante de servidor y no
puede vivir en un boton.

## Principios

Aditivo antes que destructivo; verde por fase; el spec del vault manda en UI;
schemas una sola vez en `packages/shared` y sus consumidores revisados por grep
en la misma fase; los modulos de la API se hablan por eventos y las dos
excepciones sancionadas no se amplian; ningun PAN en servidor ni en pantalla
(solo `brand` y `last4` ya persistidos); sin supresiones nuevas
(`eslint-disable`, `@ts-ignore`, `any`); copy visible en espanol, identificadores
en ingles; colores solo por token, tambien en los graficos.

## Mapa de fases

| Fase | Nombre                                                 | Area            | Impacto        | Shared | Prisma | Commit sugerido                                                 |
| ---- | ------------------------------------------------------ | --------------- | -------------- | ------ | ------ | --------------------------------------------------------------- |
| 0    | Pre-flight (solo lectura + fila del ROADMAP)           | --              | Ninguno        | No     | No     | _(sin commit)_                                                  |
| 1    | Alinear el contrato de admin: shared, api-client y MSW | shared + mobile | **Correctivo** | **Si** | No     | `fix(api-client): align admin metrics with the served contract` |
| 2    | API: suscripciones de admin y escritura de zonas       | api + shared    | Aditivo        | **Si** | No     | `feat(api): admin subscriptions and zones endpoints`            |
| 3    | Admin: dashboard de metricas con graficos              | admin           | Aditivo        | No     | No     | `feat(admin): metrics dashboard`                                |
| 4    | Admin: usuarios y suscripciones                        | admin           | Aditivo        | No     | No     | `feat(admin): users and subscriptions pages`                    |
| 5    | Admin: zonas y visor de outbox                         | admin           | Aditivo        | No     | No     | `feat(admin): zones crud and outbox viewer`                     |
| 6    | Playwright: `metrics.spec.ts` y `users.spec.ts`        | admin           | Aditivo        | No     | No     | `test(admin): cover metrics tiles and role changes`             |
| 7    | Cierre: bateria completa + AI log                      | --              | Ninguno        | No     | No     | `docs: log ai session admin-metrics-users-subscriptions`        |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar la linea base, verificar por grep los consumidores que
las Fases 1 y 2 van a tocar, y corregir la unica linea de documentacion que hoy
contradice al codigo.

**Area**: -- · **Spec**: -- · **Shared**: No · **Prisma**: No · **Eventos**: No

**Archivos**: `.claude/roadmap/ROADMAP.md` (filas 10 y 12), nada mas.

**Acciones**:

1. Rama `feat/admin-metrics-users-subscriptions` desde `main` (debe incluir
   `3543e29`). Bootstrap del worktree con los dos pasos que el AI log del item 06
   dejo registrados: copiar los `.env` ignorados (`apps/api/.env`,
   `apps/admin/.env`) y **compilar `packages/shared`**, sin lo cual el typecheck
   de las tres apps cae en masa.
2. `pnpm db:up`, `prisma migrate deploy`, `prisma db seed`. Comprobar como ADMIN
   que `GET /v1/admin/metrics` y `GET /v1/admin/outbox` responden, y que un
   token de `ana@` recibe **403** en ambos.
3. Linea base verde: `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`
   y `--scope api --only typecheck,lint,unit`.
4. **Grep de consumidores, escrito en el reporte de la fase** (no de memoria):
   `AdminMetrics`, `adminMetricsSchema`, `userProfileSchema`, `UserProfile`.
   El plan afirma que ninguna pantalla de mobile consume metricas y que
   `userProfileSchema` lo consumen `/me`, `admin/users`, el `AuthProvider` y MSW.
   **Si el grep dice otra cosa, gana el grep** y las Fases 1 y 4 se ajustan.
5. Confirmar el prerequisito D6: `recharts` en `apps/admin/package.json` antes de
   la Fase 3. Si no esta, no bloquea las Fases 1 y 2.
6. Corregir en `.claude/roadmap/ROADMAP.md` las filas 10 y 12, hoy `pendiente`
   pese a estar mergeadas (hallazgo 9). Es la unica escritura de esta fase.

**Verificacion** (acotada a la fase):

- Los dos `quality-check` de la accion 3 en verde.
- 403 de `ana@` en los dos endpoints de admin (accion 2).

**Riesgos**: si la linea base ya esta roja, cualquier gate posterior es ruido y
hay que decidir aparte si se arregla antes de empezar.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: `docs: correct roadmap rows for items 10 and 12`

---

## Fase 1 -- Alinear el contrato de admin: shared, api-client y MSW

**Objetivo**: que exista **un solo** `AdminMetrics`, que sea el que la API sirve,
y que MSW lo espeje. Sin esto la Fase 3 se escribe contra un tipo falso.

**Area**: shared + mobile · **Impacto**: correctivo

**Archivos**:

- `packages/api-client/src/resources/admin.ts` -- borrar la interfaz de `:5-11`,
  importar `AdminMetrics` de `@oneimpact/shared`, agregar `outbox()`.
- `packages/api-client/src/index.ts:16` -- quitar el re-export del tipo propio.
- `packages/shared/src/schemas/admin.ts` -- `updatesByDay` en
  `adminMetricsSchema` (D2).
- `apps/api/src/modules/impact/infrastructure/admin-metrics.repository.ts` --
  producir la serie, al lado de `countUpdatesSince` (`:80-82`).
- `apps/api/src/modules/impact/application/admin-metrics.service.ts:6` --
  `CACHE_MS` a 10 s (D3).
- `apps/mobile/src/api/msw/admin-state.ts:94-120` -- forma real y borrar el
  comentario falso.
- `apps/mobile/__tests__/msw-handlers.test.ts` -- ampliar el caso ADMIN para que
  valide la respuesta contra `adminMetricsSchema`, no contra campos a mano.
- `apps/api/test/admin-metrics.e2e-spec.ts` -- cubrir `updatesByDay`.

**Shared**: **Si**. `adminMetricsSchema` gana un campo requerido. Consumidores:
el DTO de la API (`admin-metrics.dto.ts`, generado del schema, no hay que
tocarlo), MSW y los tests. **Ninguna pantalla**, porque el primer consumidor de
UI lo crea la Fase 3.
**Prisma**: No -- `ProjectUpdate.publishedAt` ya existe e indexa lo que hace
falta.
**Eventos**: No.

**Acciones**:

1. `updatesByDay` en el schema: `{ date: string (YYYY-MM-DD); count: number }[]`,
   **un punto por dia de la ventana de 30, incluidos los ceros** (D2). El dia se
   calcula en **UTC**, por el mismo motivo que `JourneyPoint.month`
   (`.claude/rules/30-api-event-driven.md`): con la zona local, un avance cerca
   de medianoche cae en el dia equivocado y el test se vuelve intermitente.
2. Repositorio: `groupBy` por dia sobre `publishedAt >= hoy-30d`, y relleno de
   los dias sin filas. El relleno va en el repositorio, no en el cliente: es la
   misma decision que ya tomo el item 12 para `activeSubscriptionsByPlan`
   (`packages/shared/src/schemas/admin.ts:17-21`).
3. `CACHE_MS` a 10 s (D3), con el comentario explicando por que baja.
4. `api-client`: borrar la interfaz, importar del contrato, agregar
   `outbox: () => request<OutboxEventSummary[]>(API_PATHS.admin.outbox)`.
   **Array plano**, no `{items,total}` (hallazgo 1).
5. MSW: `getAdminMetrics` devuelve la forma real, incluida `updatesByDay`
   derivada de los updates del fixture.
6. Tests: el de MSW valida con `adminMetricsSchema.safeParse(...).success`, que
   es lo que convierte "MSW y API devuelven lo mismo" en algo que un test puede
   afirmar. El e2e cubre que `updatesByDay` trae 30 puntos.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope shared`
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "msw"`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only e2e` (Postgres arriba):
  toca un endpoint servido.
- Caso negativo: `ana@` sigue recibiendo **403** en `/v1/admin/metrics`.

**Riesgos**:

- Es la unica fase **correctiva** del plan: toca cosas que hoy compilan. Si el
  grep de la Fase 0 encontro un consumidor no previsto, se actualiza **en esta
  misma fase**, nunca se deja roto.
- `packages/shared` resuelve por `dist/`: tras tocarlo hay que rebuildear antes
  de creerle a un typecheck de otra app.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `fix(api-client): align admin metrics with the served contract`

---

## Fase 2 -- API: suscripciones de admin y escritura de zonas

**Objetivo**: los dos endpoints que el spec manda agregar, con sus schemas en
`shared` y sus casos negativos.

**Area**: api + shared

**Archivos**:

- `packages/shared/src/schemas/admin.ts` -- `adminSubscriptionSchema` (suscripcion
  - usuario + plan + pagos) y su envoltorio de lista.
- `packages/shared/src/schemas/catalog.ts` -- `createZoneSchema`,
  `updateZoneSchema`.
- `packages/shared/src/api-paths.ts` -- `admin.subscriptions`, `zones.create`,
  `zones.update(slug)`.
- `apps/api/src/modules/subscriptions/controllers/admin-subscriptions.controller.ts` (nuevo)
- `apps/api/src/modules/subscriptions/controllers/dto/admin-subscription.dto.ts` (nuevo)
- `apps/api/src/modules/subscriptions/application/admin-subscriptions.service.ts` (nuevo)
- `apps/api/src/modules/subscriptions/infrastructure/subscriptions.repository.ts` -- listado con `include`
- `apps/api/src/modules/payments/application/payments.service.ts` -- `listBySubscriptionIds` (D5)
- `apps/api/src/modules/catalog/controllers/admin-zones.controller.ts` (nuevo)
- `apps/api/src/modules/catalog/application/catalog.service.ts` -- create/update
- `packages/api-client/src/resources/{admin,zones}.ts` -- metodos nuevos
- `apps/api/test/admin-subscriptions.e2e-spec.ts`, `apps/api/test/admin-zones.e2e-spec.ts` (nuevos)
- Specs unitarios de los dos servicios nuevos

**Shared**: **Si**, cuatro schemas nuevos y tres rutas. Consumidores: solo
`api-client` y los DTO de la API; el admin los consume desde la Fase 4. Mobile no
los toca -- **pero MSW debe ganar handlers para las tres rutas nuevas** o dejara
de espejar el contrato (misma regla que la Fase 1 acaba de aplicar).
**Prisma**: **No**. `Subscription.payments`, `Subscription.user`,
`Subscription.plan` y `Zone` ya estan modelados. **Sin migracion y sin cambios de
seed.**
**Eventos**: No. Crear o editar una zona **no** emite evento: la tabla de 8
eventos no tiene uno de catalogo y no se inventa (`30-api-event-driven.md`).

**Acciones**:

1. `adminSubscriptionSchema`: la suscripcion mas `user: {id,email,name}`,
   `plan: {id,name}` y `payments: Payment[]`. **`Payment` se reusa tal cual de
   `packages/shared/src/schemas/payment.ts`**: ya es `{brand,last4,...}` sin PAN.
   No se declara una segunda forma de pago.
2. `AdminSubscriptionsService`: lista con filtros opcionales `status` y `planId`
   (los que pide el spec). Los pagos se piden a `PaymentsService`
   **por lote**, nunca uno por fila.
3. `AdminSubscriptionsController`: `@Roles('ADMIN')` a nivel de clase, en el
   modulo `subscriptions`, **separado** de `SubscriptionsController` para que no
   herede su configuracion de usuario.
4. `createZoneSchema` / `updateZoneSchema` con `slug` validado por el
   `zoneSlugSchema` que ya existe (`catalog.ts:4-6`). `imageKey` es la clave que
   devuelve `POST /uploads/sign`, no una URL.
5. `AdminZonesController` con `@Roles('ADMIN')`; **no** hereda el `@Public()` de
   `ZonesController`. Slug duplicado -> `DomainError` tipado (`ZONE_SLUG_TAKEN`),
   nunca un `throw new Error`.
6. `api-client`: metodos nuevos. MSW: handlers nuevos para las tres rutas.
7. e2e de los dos endpoints, **con los casos negativos**.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope shared`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only e2e` (Postgres arriba)
- **Casos negativos obligatorios** (zona de riesgo auth y roles):
  - Sin token -> **401** en los tres endpoints nuevos.
  - Token de `ana@` (USER) -> **403** en los tres.
  - `POST /v1/zones` con un slug que ya existe -> error de dominio tipado, no 500.
  - `PATCH /v1/zones/:slug` sobre un slug inexistente -> 404.
  - La respuesta de `GET /v1/admin/subscriptions` **no contiene ningun campo
    parecido a un PAN**: assert explicito sobre las claves de `payments[]`,
    con `Object.keys(...).sort()`, no `toMatchObject`.
- `bash scripts/dev/quality-check.sh --scope mobile --only typecheck,lint,unit --filter "msw"`

**Riesgos**:

- La tentacion de inyectar `UsersService` para el nombre del usuario. Sale del
  `include` del propio repositorio; un import cruzado aca es hallazgo bloqueante
  (D5).
- El envoltorio de lista: `{items,total}` como el resto, **no** array plano. El
  array plano del outbox es la excepcion documentada, no el patron.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(api): admin subscriptions and zones endpoints`

---

## Fase 3 -- Admin: dashboard de metricas con graficos

**Objetivo**: `(dashboard)/dashboard/page.tsx` con los cuatro tiles y los tres
graficos, refrescando solo.

**Area**: admin

**Archivos**:

- `apps/admin/src/app/(dashboard)/dashboard/page.tsx` -- **reescribe** el placeholder
- `apps/admin/src/features/metrics/hooks.ts` -- `useMetrics`
- `apps/admin/src/features/metrics/StatTile.tsx`
- `apps/admin/src/features/metrics/SubscriptionsByPlanChart.tsx` (barras)
- `apps/admin/src/features/metrics/UpdatesTrendChart.tsx` (linea)
- `apps/admin/src/features/metrics/ProgressByZoneChart.tsx` (barras horizontales)
- `apps/admin/src/features/metrics/chart-theme.ts` -- colores desde los tokens
- `apps/admin/src/features/metrics/format.test.ts` -- MRR y fechas del eje
- `apps/admin/src/lib/query-keys.ts` -- rama `metrics`

**Spec**: `admin-web.md`, "Rutas" (linea del dashboard) y spec 13, seccion
Metricas. **Cargar la skill `dataviz` antes de escribir el primer grafico** (D6).

**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `useMetrics` sobre `browserApi.admin.metrics()`, con `refetchInterval` de
   15 s **explicito en el hook** (D3), no en el provider.
2. Cuatro tiles: usuarios, suscripciones activas (suma de
   `activeSubscriptionsByPlan`), MRR simulado (`mrrSimulated`, **formateado
   desde centavos**: `Payment.amount` esta en centavos segun
   `schema.prisma`, y el formateo es logica pura, o sea testeable) y proyectos
   activos (`projectsByStatus.ACTIVE`).
3. Los tres graficos con Recharts, **colores desde `chart-theme.ts` alimentado
   por los tokens**, nunca la paleta por defecto de Recharts ni un hex suelto.
4. `UpdatesTrendChart` sobre `updatesByDay`, con **estado vacio explicito**
   cuando todos los puntos son cero (D2) -- que es el caso contra el seed de hoy.
5. Estados de carga y error con `EmptyState` y el patron de las paginas de
   proyectos, no un spinner suelto.
6. Test de logica pura (`format.test.ts`): centavos -> moneda, y etiqueta de eje
   desde `YYYY-MM-DD`. **Los graficos no se testean con RTL**: la decision D5 del
   plan del item 11 difirio montar RTL y este plan no la revierte.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`
- Grep de hex sueltos en `src/features/metrics/`: **cero**.
- **Pendiente manual** (navegador, API arriba con seed):
  - Los cuatro tiles cuadran con el seed: 2 usuarios, 0 suscripciones, MRR 0,
    4 proyectos activos.
  - El grafico de linea muestra su estado vacio (**no** un area en blanco): es lo
    esperado, el avance mas reciente del seed tiene 70 dias (hallazgo 3).
  - Publicar un avance desde `/projects/[id]/updates` y ver moverse el tile de
    avances y la linea en <= 25 s sin recargar. **Es la verificacion del
    criterio de aceptacion del spec** y no la cubre ningun test.
  - Los graficos legibles a 1280 y a 1440, y con el sidebar abierto.

**Riesgos**:

- Recharts trae su propia paleta y sus propios tamanos de fuente; sin la skill
  `dataviz` y sin `chart-theme.ts` el dashboard sale con cara de generico, que es
  justo lo que el vault prohibe ("el admin no es un panel generico").
- Recharts necesita `'use client'` y un contenedor con alto explicito;
  `ResponsiveContainer` con alto en porcentaje dentro de un padre sin alto
  colapsa a cero.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(admin): metrics dashboard`

---

## Fase 4 -- Admin: usuarios y suscripciones

**Objetivo**: las dos tablas con su interaccion: cambiar rol con confirmacion, y
ver los pagos simulados de cada suscripcion.

**Area**: admin

**Archivos**:

- `apps/admin/src/app/(dashboard)/users/page.tsx` -- reescribe el placeholder
- `apps/admin/src/app/(dashboard)/subscriptions/page.tsx` -- idem
- `apps/admin/src/features/users/{UsersTable,RoleChangeDialog,hooks,search}.tsx|ts`
- `apps/admin/src/features/subscriptions/{SubscriptionsTable,PaymentsRow,SubscriptionsFilters,hooks}.tsx|ts`
- `apps/admin/src/features/users/search.test.ts`,
  `apps/admin/src/features/subscriptions/filters.test.ts`
- `apps/admin/src/lib/query-keys.ts` -- ramas `users` y `subscriptions`

**Spec**: spec 13, secciones Usuarios y Suscripciones.

**Shared**: No -- consume lo de la Fase 2 · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `UsersTable`: nombre, email, rol como `Badge`, creado (`createdAt` de la
   Fase 1... **no**: de D4, agregado en esta fase si el grep de la Fase 0 lo
   confirmo pendiente) y suscripcion activa, cruzada en el cliente con
   `Map<userId, Subscription>` (D4).
2. Busqueda por email: **filtrado en cliente sobre la lista ya cargada**, en un
   helper puro y testeado. El endpoint no pagina ni busca, y agregarle un `?q=`
   es alcance que el spec no pide.
3. `RoleChangeDialog`: confirmacion que **nombra al usuario y el rol destino**.
   La fila del propio usuario **no ofrece el cambio** (D7).
4. `useSetRole` con invalidacion por prefijo de `queryKeys.users.all()`, siguiendo
   `src/features/projects/hooks.ts`.
5. `SubscriptionsTable`: usuario, plan, billing, estado, inicio; fila expandible
   con los pagos (`brand`, `last4`, estado, importe). **`last4` se pinta como
   `**** 4242`**: nunca se compone algo que parezca un numero completo.
6. Filtros por estado y plan, en un helper puro y testeado, siguiendo
   `src/features/projects/filters.ts`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`
- **Casos negativos obligatorios**:
  - La fila del propio admin no ofrece cambio de rol (D7).
  - Un `PATCH` que falle deja la tabla como estaba y muestra el error; no hay
    optimismo que mienta.
- Grep en `src/features/subscriptions/`: ninguna referencia a `pan`, `number` o
  `cvc`.
- **Pendiente manual**: cambiar el rol de `ana@` a ADMIN y verificarlo en el
  panel admin de mobile (`app/(app)/admin.tsx`, item 10) -- **es el segundo
  criterio de aceptacion del spec**; luego revertirlo.

**Riesgos**:

- El cruce usuarios/suscripciones depende de dos queries: mientras una carga, la
  columna tiene que decir "--", no "sin suscripcion", que seria mentira.
- Cambiar el rol del usuario con el que corre Playwright rompe la suite entera
  si el spec de la Fase 6 no revierte. Por eso el spec revierte (spec 13,
  "users.spec.ts: cambiar rol y revertir").

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(admin): users and subscriptions pages`

---

## Fase 5 -- Admin: zonas y visor de outbox

**Objetivo**: cerrar las dos pantallas que quedan. El outbox es la ventana a la
arquitectura a eventos.

**Area**: admin

**Archivos**:

- `apps/admin/src/app/(dashboard)/zones/page.tsx` -- reescribe el placeholder
- `apps/admin/src/app/(dashboard)/zones/new/page.tsx`,
  `apps/admin/src/app/(dashboard)/zones/[slug]/page.tsx`
- `apps/admin/src/features/zones/{ZonesTable,ZoneForm}.tsx`,
  `hooks.ts` (ampliar el que ya existe)
- `apps/admin/src/app/(dashboard)/outbox/page.tsx` (ruta nueva)
- `apps/admin/src/features/outbox/{OutboxTable,status.ts,status.test.ts}`
- `apps/admin/src/components/layout/Sidebar.tsx` -- entrada de Outbox
- `apps/admin/src/lib/query-keys.ts` -- rama `outbox`

**Spec**: spec 13, secciones Zonas y Outbox; `admin-web.md`, "Rutas" (`zones/
CRUD simple`) y "Subida de imagenes".

**Shared**: No · **Prisma**: No · **Eventos**: No emite; **lee** `OutboxEvent`.

**Acciones**:

1. `ZoneForm` con `react-hook-form` + `zodResolver(createZoneSchema)` de la
   Fase 2. Imagen mediante `POST /uploads/sign`, **reutilizando
   `src/features/projects/upload.ts`**, que ya trata el caso `simulated: true`.
   Si la subida es simulada, la zona se guarda **sin imagen nueva** y se avisa;
   no se inventa una URL para satisfacer un `z.url()`.
2. `ZonesTable`: orden, nombre, slug, y cuantos proyectos tiene cada zona (sale
   de `useProjects` ya cacheado, o de `avgProgressByZone` de metricas; lo que no
   agregue una peticion nueva).
3. `OutboxTable`: tipo, creado, procesado, intentos y error. Estado como `Badge`
   con tres colores por token: `PENDING`, `PROCESSED`, `FAILED`.
   **`status` viene derivado del servidor** (`outbox-admin.controller.ts:50-58`):
   no se recalcula en el cliente, se pinta.
4. `status.ts` puro y testeado: `OutboxEventStatus` -> etiqueta en espanol y
   variante de badge. Es la unica logica de esta pantalla.
5. Entrada de Outbox en el `Sidebar`, al final: es diagnostico, no operacion
   diaria.
6. Refresco del outbox: **manual, con boton "Actualizar"**, no poll. Es una
   pantalla de diagnostico que se mira a proposito; un poll seria ruido de red
   permanente para algo que casi siempre esta quieto.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope admin --only typecheck,lint,unit`
- **Casos negativos**: slug duplicado -> error inline bajo el campo, no banner
  generico ni 500; almacenamiento simulado -> aviso visible y zona guardada sin
  imagen.
- **Pendiente manual**: crear una suscripcion desde mobile y ver aparecer
  `subscription.activated` en el outbox como `PROCESSED`. **Es la demo de la
  arquitectura a eventos**; el item 12 dejo un `OutboxFaultInjector`
  (`apps/api/src/infra/events/outbox-fault-injector.ts`) con el que se puede
  forzar un `FAILED` para ver los tres estados.

**Riesgos**:

- El outbox del seed esta vacio: recien seedeada, la tabla no tiene nada que
  mostrar. El estado vacio tiene que explicar que es normal, no parecer un fallo.
- `zones/[slug]` colisiona conceptualmente con `zones/new` si el slug pudiera ser
  `new`. `zoneSlugSchema` no lo prohibe: conviene rechazarlo en el form.

CHECKPOINT -- Detente aca. No inicies la Fase 6 sin aprobacion.
**Commit sugerido**: `feat(admin): zones crud and outbox viewer`

---

## Fase 6 -- Playwright: metricas y cambio de rol

**Objetivo**: los dos specs que pide el spec 13, corriendo con la sesion de admin
que el item 11 ya monta.

**Area**: admin

**Archivos**:

- `apps/admin/e2e/metrics.spec.ts` (nuevo)
- `apps/admin/e2e/users.spec.ts` (nuevo)
- `apps/admin/e2e/constants.ts` -- constantes del seed que asertan los specs

**Spec**: spec 13, seccion Playwright; `admin-web.md`, "Playwright (e2e)".

**Shared**: No · **Prisma**: No · **Eventos**: No

**Acciones**:

1. `metrics.spec.ts`: los tiles cuadran con el seed. Los valores esperados van a
   `constants.ts` junto a `SEEDED_PROJECT_TITLES`, que ya existe, **no
   hardcodeados en el spec**.
   **No se asertan los graficos por pixel ni el de linea por contenido**: contra
   el seed esta vacio por construccion (hallazgo 3), y un assert que dependa de
   "hoy menos 30 dias" es intermitente por diseno. Se aserta que **la seccion
   existe y muestra su estado vacio**.
2. `users.spec.ts`: cambiar el rol de `ana@` a ADMIN, verificar el badge, y
   **revertirlo en el mismo test**, no en un `afterAll` que puede no correr si el
   test falla antes. Dejar a `ana@` como ADMIN contaminaria las corridas
   siguientes y el resto de la suite.
3. Los dos specs van **autenticados por defecto**: no se tocan `ANONYMOUS_SPECS`
   ni `playwright.config.ts` (hallazgo 7).
4. Caso negativo de rol: un USER que llega a `/users` termina en `/403`, que es
   lo que ya cubre el middleware; se aserta si no encarece el spec.

**Verificacion** (acotada a la fase):

- `pnpm --filter @oneimpact/admin test:e2e` con API y Postgres arriba.
- **Corrida doble**: la suite pasa dos veces seguidas sin re-seedear. Es lo que
  prueba que `users.spec.ts` revierte de verdad.
- **Ojo con el puerto**: `playwright.config.ts` levanta el panel en 5001 con
  `reuseExistingServer: true`. Si el arbol principal ya tiene un admin ahi,
  Playwright **reusa ese** y prueba contra otro codigo. En worktree hay que
  levantar el panel en un puerto libre y pasar `PLAYWRIGHT_BASE_URL`. Ya mordio
  en el item 09.

**Riesgos**:

- Los tiles dependen del estado de la base: si otro spec creo una suscripcion,
  el conteo cambia. Por eso se asertan **conteos del seed que ningun otro spec
  toca** (usuarios, proyectos), y no los que si (suscripciones).

CHECKPOINT -- Detente aca. No inicies la Fase 7 sin aprobacion.
**Commit sugerido**: `test(admin): cover metrics tiles and role changes`

---

## Fase 7 -- Cierre: bateria completa y AI log

**Objetivo**: arbol verde de punta a punta y la sesion registrada.

**Area**: -- · **Shared**: No · **Prisma**: No · **Eventos**: No

**Archivos**: `docs/ai-workflow.md`, `.claude/roadmap/ROADMAP.md` (fila 13),
`.claude/plans/README.md`.

**Acciones**:

1. `bash scripts/dev/quality-check.sh --scope all` -- unica corrida completa del
   plan, con Postgres arriba.
2. `/ai-log`. Anotar **explicitamente**: (a) el desfase de `AdminMetrics` entre
   `api-client` y el contrato, y que MSW llevaba tiempo sirviendo la forma vieja;
   (b) que el grafico de 30 dias esta vacio contra el seed **por diseno del
   dataset**, no por un bug, y como se demuestra en vivo; (c) que `CACHE_MS` bajo
   a 10 s y por que; (d) la PREGUNTA ABIERTA de D7 sobre garantizar al menos un
   ADMIN.
3. Roadmap: fila 13 a `hecho` con su rango de commits.
4. Listar los pendientes manuales acumulados de las Fases 3 a 5 sin darlos por
   hechos, en particular los dos criterios de aceptacion del spec, que son
   manuales los dos.

**Verificacion** (acotada a la fase):

- `--scope all` en verde. Si Playwright falla por puerto ocupado, **no es una
  regresion**: se repite aislado antes de declarar nada.
- `docs/ai-workflow.md` sin emojis.

**Riesgos**: `--scope all` incluye los e2e de la API y de Playwright, o sea
Postgres arriba y puertos libres. Un fallo de entorno no es un fallo de codigo y
no se reporta como tal.

CHECKPOINT -- Fin del plan. Cerrar con `/merge-plan admin-metrics-users-subscriptions`.
**Commit sugerido**: `docs: log ai session admin-metrics-users-subscriptions`

---

## Trazabilidad: criterios de aceptacion del spec -> fase

| Criterio del spec 13                                                              | Fase        | Como se cubre                                                                                                 |
| --------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| Tras crear una suscripcion desde mobile, el tile y la tabla la reflejan en < 30 s | 3 y 4       | `CACHE_MS` 10 s + `refetchInterval` 15 s = peor caso 25 s (D3). **Verificacion manual**, ningun test la cubre |
| Cambiar rol de `ana@` a ADMIN le habilita el panel admin mobile                   | 4 y 6       | `RoleChangeDialog` + `users.spec.ts`; la comprobacion en mobile es **manual**                                 |
| Tiles, graficos y `useMetrics` con refresco                                       | 3           | `updatesByDay` nuevo (D2); la linea sale vacia contra el seed y lo dice                                       |
| Tabla de usuarios con creado y suscripcion activa                                 | 4           | `createdAt` en `userProfileSchema` + cruce en cliente (D4)                                                    |
| Tabla de suscripciones con pagos expandibles y filtros                            | 2 y 4       | `GET /v1/admin/subscriptions` (D5); `last4` como `**** 4242`                                                  |
| CRUD de zonas con imagen por signed URL                                           | 2 y 5       | `POST/PATCH /v1/zones`; reusa `upload.ts` con su caso simulado                                                |
| Visor de outbox                                                                   | 5           | `GET /v1/admin/outbox` ya servido por el item 12; `status` derivado en servidor                               |
| `metrics.spec.ts` y `users.spec.ts`                                               | 6           | Autenticados por defecto; `users.spec.ts` revierte dentro del test                                            |
| Los tres `quality-check` del spec                                                 | 1, 2, 3 y 7 | Por fase el suyo; `--scope all` una vez al cierre                                                             |
