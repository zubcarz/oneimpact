# Plan -- API: pago simulado, suscripciones y efectos por eventos (por fases, checkpoint por fase)

> **Fecha**: 2026-08-22
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/06-api-payments-subscriptions-events.md` (item 06, ola 3, depende de 05 que ya esta en `main` en `07f5d04`).
> **Base**: vault `01-Tecnologia-Arquitectura/backend-nest.md` (tabla de eventos, pago simulado), `arquitectura-sistema.md` (contrato REST `/v1`, flujo clave, modelo de datos y sus notas de "Implementado 2026-08-22"), reglas `30-api-event-driven.md` y `50-testing-and-verification.md`. Planes previos: `20260822-api-auth-and-roles.plan.md`, `20260822-api-catalog-and-projects.plan.md`, `20260822-shared-contract-and-seed.plan.md`.
> **Areas**: api + shared (`packages/shared`, `packages/api-client`)
> **Contrato shared tocado**: **Si**. `src/api-paths.ts` (2 rutas nuevas), `src/types/subscription.ts` (2 campos nuevos en `DashboardSummary`), y schemas zod nuevos para respuestas (`subscriptionSchema`, `dashboardSummarySchema`, `notificationSchema`, `signedUploadSchema`). Consumidores verificados por grep: **solo** `packages/api-client/src/resources/{subscriptions,dashboard,notifications,projects}.ts`. Ninguna pantalla de `apps/mobile` ni `apps/admin` los usa todavia (items 09/10/11 aun pendientes).
> **Schema Prisma tocado**: **Si**, dos migraciones aditivas: `payment_user_and_optional_subscription` (fase 2) y `project_update_generated_id` (fase 3). El seed **no cambia** (nunca escribe `Payment` ni `ProjectUpdate` con id autogenerado); MSW de mobile no existe todavia (item 07).
> **Eventos**: emite `payment.succeeded`, `payment.failed`, `subscription.activated`, `subscription.canceled`, `project.created`, `project.update_published`, `project.followed`. Escucha `user.registered`, `subscription.activated`, `subscription.canceled`, `project.update_published`, `payment.*`.
> **Zonas de riesgo**: **las tres**. Pago simulado (el PAN nunca llega al servidor), auth/roles (endpoints ADMIN y USER nuevos), eventos/listeners (idempotencia real contra claves unicas de Postgres).
> **Fase del roadmap**: Fase 1 -- ola 3 (paralelo con 08 mobile y 11 admin). Entrega lunes 24 ago 2026 18:00.
> **Como ejecutar**: `/run-plan-worktree` (lo que indica el spec; la ola 3 corre en paralelo con lanes de mobile/admin y este item toca `schema.prisma`, asi que necesita su propio worktree y serializar la migracion contra Postgres local).

## Objetivo

Cerrar el nucleo de negocio de la API: `POST /v1/subscriptions` con pago simulado
que activa una suscripcion y dispara, **solo por eventos**, el primer punto de
travesia (`impact`) y las notificaciones (`notifications`); mas la escritura de
proyectos, avances y follows que consumen el admin (item 11) y mobile (08/10).
Al cerrar el plan, los cinco criterios de aceptacion e2e del spec pasan.

## Contexto y hallazgos del analisis

### Lo que ya existe y no hay que reinventar

- `EventBus.publish(event, tx?)` con firma definitiva en `apps/api/src/infra/events/event-bus.ts:28`. Hoy hace `emitAsync` e ignora `tx`; el outbox es el item 12. **Los call sites de este plan ya deben pasar `tx`** cuando publican dentro de una transaccion, para que el item 12 no toque ningun modulo.
- Los 8 nombres de evento ya estan en `apps/api/src/infra/events/event-names.ts:10-19`. **No se agrega ninguno**.
- Los payloads de los tres eventos de `projects` ya estan tipados en `apps/api/src/modules/projects/domain/projects.events.ts:26-56`, escritos por el item 02 precisamente para que este item los emita. Se usan tal cual.
- `UsersListener` (`apps/api/src/modules/users/application/users.listener.ts:39`) **ya escucha `subscription.activated`** y marca `onboardingCompleted`. En cuanto la fase 2 emita el evento, ese listener empieza a funcionar sin tocarlo: es el primer test de integracion gratis del bus.
- `DomainError` + `DomainErrorFilter` mapean `{statusCode, code, message}` (`apps/api/src/common/filters/domain-error.filter.ts:18`). `PAYMENT_DECLINED` (402), `SUBSCRIPTION_EXISTS` (409) y `SUBSCRIPTION_NOT_FOUND` (404) salen por ahi. **Ningun `throw new Error`** en use cases.
- Guards globales ya cableados como `APP_GUARD` dentro de `AuthModule` (`apps/api/src/modules/auth/auth.module.ts:65-66`), en orden JWT -> Roles. Un endpoint nuevo sin `@Public()` ya esta protegido; `@Roles('ADMIN')` ya funciona.
- Patron de DTO establecido: schema zod en `packages/shared` -> `createZodDto` (`apps/api/src/modules/projects/controllers/dto/project.dto.ts:8`). Nunca redeclarar campos en el DTO.
- e2e: `test/utils/create-test-app.ts:17` replica prefijo/pipe/filtro; `test/utils/auth-helpers.ts:38` da `loginAs(app,'admin'|'user')` y `registerTestUser`; `test/utils/seed-once.ts:16` memoiza el seed. `jest-e2e.json:9` fija `maxWorkers: 1`.

### Hallazgos que cambian el diseno (bloqueantes o casi)

1. **`Payment.subscriptionId` es obligatorio y el pago se simula ANTES de crear la suscripcion.**
   `apps/api/prisma/schema.prisma:121-122` declara `subscriptionId String` con FK no nula. El flujo del spec es: simular -> si SUCCEEDED crear `Subscription`. Un pago FAILED **no tiene suscripcion a la que colgarse**, asi que hoy es literalmente imposible persistir el `Payment{status:FAILED}` que pide el spec. Ver decision D1.
2. **`ProjectUpdate.id` no tiene `@default`.** `apps/api/prisma/schema.prisma:170` lo declara `String @id` a secas, con el comentario "stable seed id, e.g. `<slug>-update-1`". `POST /v1/projects/:id/updates` no puede crear una fila sin inventar un id. Ver decision D3.
3. **`Notification` tiene `@@unique([userId, type, refId])` con `refId` nullable** (`apps/api/prisma/schema.prisma:219`). En Postgres **dos NULL no colisionan en un unique**: un listener que cree la notificacion de bienvenida con `refId: null` duplicaria en cada reentrega y el test de idempotencia fallaria. El vault ya lo advierte (`arquitectura-sistema.md`, nota de "Implementado 2026-08-22"). **Regla de este plan: `refId` SIEMPRE no nulo** -- `WELCOME` -> `userId`, `SUBSCRIPTION` -> `subscriptionId`, `PROJECT_UPDATE` -> `updateId`.
4. **`JourneyPoint` es unico por `[userId, month, source]`, no por `userId+month`** (`apps/api/prisma/schema.prisma:204`). El spec dice "upsert por `userId+month`"; el codigo manda: el `upsert` va con la clave de tres campos y `source: SUBSCRIPTION`.
5. **`createProjectSchema` no tiene `slug` y `Project.slug` es `@unique` obligatorio** (`packages/shared/src/schemas/projects.ts:5-23` vs `apps/api/prisma/schema.prisma:145`). `POST /v1/projects` tiene que derivarlo. Ver decision D4.
6. **`publishUpdateSchema` valida `mediaUrl` (URL) pero Prisma guarda `mediaKey` (clave de asset)** (`packages/shared/src/schemas/projects.ts:33` vs `apps/api/prisma/schema.prisma:175`). El item 01 decidio guardar claves relativas, no URLs. Ver decision D5.
7. **`ProjectsController` es `@Public()` a nivel de clase** (`apps/api/src/modules/projects/controllers/projects.controller.ts:27`) y su propio doc avisa: un endpoint de escritura **no** debe heredar eso. Los writes van en **controllers nuevos** (`AdminProjectsController`, `ProjectFollowsController`, `UploadsController`), no como metodos extra de ese controller.
8. **`payments` no puede ser importado por `subscriptions` sin romper la regla de oro** de `30-api-event-driven.md` ("un modulo no importa servicios de otro modulo", excepcion unica `catalog`), pero el spec dice explicitamente "sin controller propio: lo invoca `subscriptions`". Ver decision D2.
9. **`api-client` ya tipa `subscriptions.me()` como `Subscription | null`** (`packages/api-client/src/resources/subscriptions.ts:12`) mientras el spec pide **404** cuando no hay activa. Discrepancia de contrato: se resuelve en la fase 1 alineando el cliente al spec (404 + `SUBSCRIPTION_NOT_FOUND`).
10. **`API_PATHS` no tiene ruta para `PATCH /v1/notifications/:id/read` ni para `POST /v1/uploads/sign`** (`packages/shared/src/api-paths.ts:27` solo tiene `notificationsMe`). Se agregan **aditivamente** (`notificationRead: (id) => ...`, `uploads: { sign }`); renombrar `notificationsMe` a un objeto anidado seria un cambio destructivo del contrato ya consumido.
11. **No existe ningun schema zod de respuesta para suscripcion / dashboard / notificacion**: `packages/shared/src/types/subscription.ts` son interfaces TS puras. Para que los controllers nuevos tengan `createZodDto` y Swagger (como catalog, auth y projects), hay que crear los schemas y derivar los tipos con `z.infer`, igual que hizo `types/catalog.ts:12-18`.
12. **`DashboardSummary` del codigo y el del spec no coinciden.** Codigo (`packages/shared/src/types/subscription.ts:38-45`): `plan, billing, status, activeMonths, followedProjects, latestUpdate?`. Spec 06: "...`journeyPoints`, `unreadNotifications`". Gana el codigo y se **extiende aditivamente** con `journeyPoints: number` y `unreadNotifications: number` (los pide item 10). Consumidor unico: `packages/api-client/src/resources/dashboard.ts:7`, y solo como tipo de respuesta -- no hay ningun sitio que construya el objeto en cliente, asi que agregar campos requeridos no rompe nada.
13. **`test/seed.e2e-spec.ts:19-44` asserta conteos exactos** (5 zonas, 5 proyectos, 5 updates, 3 planes, 2 usuarios). Todo e2e de este plan que cree proyectos, updates o usuarios **tiene que limpiarlos en su `afterAll`**, igual que `auth.e2e-spec.ts` borra los usuarios `@oneimpact.test`. Es la condicion para que la bateria siga verde.
14. **`Payment.amount` es "amount in cents"** (`apps/api/prisma/schema.prisma:123`) y los precios de `PLANS` estan en dolares enteros (`packages/shared/src/plans.ts:9-18`). El monto se calcula explicitamente: mensual `monthlyPriceFor(plan, billing) * 100`; anual `plan.annualTotal * 100`.
15. `impact` necesita leer `Subscription`, `ProjectFollow`, `ProjectUpdate` y `Notification` para `GET /v1/dashboard/me`. Lo hace **con su propio repositorio sobre `PrismaService`** (infra, permitido), nunca inyectando servicios de `subscriptions`/`projects`/`notifications`. Para el `Plan` del dashboard **si** puede inyectar `CatalogService`, que esta exportado a proposito (`apps/api/src/modules/catalog/catalog.module.ts:18`).
16. `EventsModule` es `@Global()` y ya esta en `AppModule` (`apps/api/src/app.module.ts:18`), y `app.module.ts:20-21` deja escrito el hueco para `SubscriptionsModule, PaymentsModule, ImpactModule, NotificationsModule`. Registrarlos es un renglon por fase.

## Decisiones RESUELTAS (2026-08-22, Carlos)

**No queda ninguna decision bloqueante.** Carlos acepto las **seis opciones (a)**,
las recomendadas: D1a, D2a, D3a, D4a, D5a y D6. La ejecucion procede con ellas
sin volver a preguntar.

Se dejan abajo las opciones descartadas a proposito: la entrada de
`docs/ai-workflow.md` (fase 6) tiene que contar **que se decidio y por que**, y
sin la alternativa esa entrada no dice nada. La opcion elegida esta marcada
**[ELEGIDA]** en cada una.

**D1 [RESUELTA: a] -- Como se persiste un pago rechazado.**
`Payment.subscriptionId` es NOT NULL y el pago ocurre antes de la suscripcion.

- (a) **[ELEGIDA]**: migracion aditiva `payment_user_and_optional_subscription`: `subscriptionId String?` (opcional) + `userId String` con relacion a `User` (+ `payments Payment[]` en `User`). Un rechazo queda persistido y atribuible; el item 12 (metricas admin) lo va a necesitar. La tabla `Payment` esta **vacia** en cualquier entorno (el seed nunca la escribe: `grep payment apps/api/prisma/seed.ts` no devuelve nada), asi que agregar una columna NOT NULL no requiere backfill.
- (b) No persistir los pagos FAILED (solo emitir `payment.failed`). Cero migracion, pero se pierde la auditoria y contradice "Crea `Payment{simulated:true,...}`" del spec.

**D2 [RESUELTA: a] -- Como llama `subscriptions` a `payments`.**

- (a) **[ELEGIDA]**: `PaymentsModule` **exporta** `PaymentsService` y se declara como **segunda excepcion sancionada** a la regla de oro (junto a `catalog`), documentada en el doc de clase del modulo y anotada en `.claude/rules/30-api-event-driven.md`. Justificacion: el flujo del vault es sincrono (`arquitectura-sistema.md`, "Flujo clave" paso 3) y la tabla de eventos **no tiene** un `payment.requested` con el que invertir la dependencia; inventarlo seria salirse del contrato de 8 eventos.
- (b) Mover el simulador a `src/infra/payments/` como servicio de infraestructura global (como `EventBus`), dejando `modules/payments/` inexistente. Respeta la regla al pie de la letra pero se aparta de la estructura del vault (`backend-nest.md:25`), que lista `payments/` como modulo.

**D3 [RESUELTA: a] -- Id de `ProjectUpdate` creado por API.**

- (a) **[ELEGIDA]**: migracion `project_update_generated_id` que agrega `@default(cuid())` a `ProjectUpdate.id`. Es aditiva (no toca filas existentes, los ids estables del seed se siguen pasando explicitos) y evita tener dos politicas de id conviviendo.
- (b) Generar el id en el repositorio (`crypto.randomUUID()`), sin migracion.

**D4 [RESUELTA: a] -- Slug de un proyecto creado por el admin.**
`createProjectSchema` no lo pide y `Project.slug` es unico obligatorio.

- (a) **[ELEGIDA]**: derivarlo en el servidor desde `title` (minusculas, sin acentos, `-`), con sufijo `-2`, `-3`... ante colision. No cambia el contrato de `shared` ni el form del admin (item 11).
- (b) Agregar `slug` opcional a `createProjectSchema`. Cambia el contrato y obliga a tocar el form del admin.

**D5 [RESUELTA: a] -- `mediaUrl` vs `mediaKey`.**
`publishUpdateSchema.mediaUrl` es una URL; Prisma guarda `mediaKey`.

- (a) **[ELEGIDA]**: el use case acepta `mediaUrl` tal cual llega (es lo que devuelve `POST /v1/uploads/sign`) y lo guarda en `mediaKey`, sea clave relativa o URL absoluta (el borde ya resuelve ambas). Cero cambio de contrato en esta ola.
- (b) Renombrar el campo a `mediaKey` en `packages/shared`. Cambio destructivo del contrato en plena ola 3, con el admin (item 11) escribiendose en paralelo. **No recomendado ahora**; anotarlo como deuda para item 12/13.

**D6 [RESUELTA] -- Fallback de `POST /v1/uploads/sign` sin credenciales.**
El spec lo autoriza: si faltan `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
`SUPABASE_STORAGE_BUCKET` (todas nuevas y **opcionales** en `env.ts`), devolver
una URL local ficticia y **marcar la respuesta con `simulated: true`** para que
el cliente no crea que subio algo. Se documenta en `.env.example` y en el doc
del controller.

## Principios

- Aditivo antes que destructivo: se agregan modulos, rutas, schemas y columnas; no se renombra nada de `packages/shared` que ya este consumido.
- Verde por fase, en el alcance de la fase. La bateria `--scope all` corre una sola vez, al cierre.
- Los schemas de validacion viven **una sola vez**, en `packages/shared`; la API los consume via `createZodDto`.
- Los modulos se hablan **por eventos**, no por imports. Unicas excepciones: `catalog` (ya sancionada) y `payments` si se acepta D2 opcion (a), documentada.
- **El PAN nunca llega al servidor**: ningun DTO, entidad, log ni evento de este plan tiene un campo `number`/`pan`/`cvv`. `Payment.simulated` es siempre `true`.
- Listeners **idempotentes de verdad** (upsert por clave natural no nula) y que **nunca lanzan** hacia el emisor: capturan, loguean y siguen.
- Errores de dominio como `DomainError` tipado; nunca `throw new Error`.
- Sin `eslint-disable`, sin `@ts-ignore`, sin debilitar tests para ir a verde.
- Copy visible al usuario en espanol; codigo, rutas, identificadores y commits en ingles. Sin emojis.

## Mapa de fases

| Fase | Nombre                                                               | Area   | Impacto             | Shared | Prisma                                            | Commit sugerido                                                            |
| ---- | -------------------------------------------------------------------- | ------ | ------------------- | ------ | ------------------------------------------------- | -------------------------------------------------------------------------- |
| 0    | Pre-flight (solo lectura)                                            | --     | Ninguno             | No     | No                                                | _(sin commit)_                                                             |
| 1    | Contrato de respuesta: subscription, dashboard, notification, upload | shared | Aditivo             | **Si** | No                                                | `feat(shared): subscription, dashboard and notification response contract` |
| 2    | Pago simulado + suscripciones (crear / ver / cancelar)               | api    | Aditivo + migracion | No     | **Si** (`payment_user_and_optional_subscription`) | `feat(api): simulated payments and subscriptions`                          |
| 3    | Escritura de proyectos, avances, follows y firma de subida           | api    | Aditivo + migracion | No     | **Si** (`project_update_generated_id`)            | `feat(api): project writes, follows and upload signing`                    |
| 4    | `impact`: puntos de travesia y `GET /dashboard/me`                   | api    | Aditivo             | No     | No                                                | `feat(api): impact journey points and dashboard`                           |
| 5    | `notifications`: listeners y endpoints                               | api    | Aditivo             | No     | No                                                | `feat(api): notifications listeners and endpoints`                         |
| 6    | e2e del flujo completo + bateria total + AI log                      | api    | Aditivo             | No     | No                                                | `test(api): payments, subscriptions and events e2e coverage`               |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar que el punto de partida es el que asume este plan y que las decisiones D1-D6 estan resueltas antes de escribir codigo.
**Area**: --
**Archivos**: ninguno (solo lectura).
**Spec**: --
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. Confirmar que la rama base es `main` con el item 05 mergeado (`git log --oneline -1` debe mostrar `07f5d04` o posterior) y que el worktree del plan es `feat/api-payments-subscriptions-events`.
2. Levantar Postgres (`pnpm db:up`) y aplicar el estado actual (`pnpm --filter @oneimpact/api prisma:migrate` sin cambios pendientes + `prisma:seed`). Verificar que `prisma migrate status` no reporta drift: este plan agrega dos migraciones y no puede arrancar sobre una DB desincronizada.
3. Confirmar que **ninguna otra lane de la ola 3 esta migrando** contra el mismo Postgres (el roadmap lo exige: "Postgres local es uno; si dos lanes de api necesitan migrar, se serializan").
4. Registrar la resolucion de D1, D2, D3, D4, D5 y D6 al principio del resumen de ejecucion. Si alguna se resuelve distinto a la recomendacion, anotar que fase cambia.
5. Correr la linea base verde: `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit` -> `[OK]` en los tres pasos.
- `pnpm --filter @oneimpact/api exec prisma migrate status` sin migraciones pendientes ni drift.

**Riesgos**: si `migrate status` reporta drift (por una lane paralela), **parar**: aplicar dos migraciones sobre una DB divergente produce un historial de migraciones irreparable a mano.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.
**Commit sugerido**: _(sin commit)_

---

## Fase 1 -- Contrato de respuesta: subscription, dashboard, notification, upload

**Objetivo**: que `packages/shared` tenga los schemas zod de respuesta que los controllers de las fases 2-5 necesitan para `createZodDto`, y que `packages/api-client` exponga las dos rutas que faltan. Sin esto, cada modulo inventaria su propio DTO y se rompe la regla de "los schemas viven una sola vez".
**Area**: shared
**Archivos**:

- `packages/shared/src/schemas/payment.ts:1-48` (agregar schemas de respuesta al final; no tocar `simulatedCardSchema` ni `createSubscriptionSchema`)
- `packages/shared/src/types/subscription.ts:12-57` (las interfaces pasan a derivarse con `z.infer`; `DashboardSummary` gana dos campos)
- `packages/shared/src/api-paths.ts:27-32` (dos entradas nuevas)
- `packages/shared/src/index.ts:1-11` (exportar lo nuevo si hace falta un archivo nuevo)
- `packages/api-client/src/resources/notifications.ts:5-9`, `packages/api-client/src/resources/subscriptions.ts:12`, y el barrel de recursos para el nuevo `uploads`
- Tests: `packages/shared/src/schemas/payment.test.ts` (o archivo nuevo `subscription.test.ts`)

**Spec**: --
**Shared**: **Si**.

- Nuevos schemas: `subscriptionSchema`, `paymentSchema`, `notificationSchema`, `dashboardSummarySchema`, `uploadSignSchema` (input: `{ filename, contentType }`), `signedUploadSchema` (output: `{ uploadUrl, key, expiresAt, simulated }`).
- `DashboardSummary` gana `journeyPoints: number` y `unreadNotifications: number` (hallazgo 12).
- `API_PATHS` gana `notificationRead: (id: string) => '/v1/notifications/<id>/read'` y `uploads: { sign: '/v1/uploads/sign' }` (hallazgo 10). **No renombrar `notificationsMe`**.
- Consumidores (grep hecho, hallazgo 12): unicamente los cuatro recursos de `packages/api-client`. Se actualizan **en esta misma fase**.

**Prisma**: No
**Eventos**: No

**Acciones**:

1. Escribir en `packages/shared/src/schemas/payment.ts` los schemas de respuesta `subscriptionSchema` y `paymentSchema`, espejando exactamente los campos de las interfaces actuales (`types/subscription.ts:12-36`) y usando los enums de `enums.ts`. `paymentSchema.subscriptionId` pasa a `.optional()` (coherente con D1a) y gana `userId: z.string()`.
2. Crear `notificationSchema` y `dashboardSummarySchema` (con `journeyPoints` y `unreadNotifications`), y `uploadSignSchema` / `signedUploadSchema`.
3. Reescribir `packages/shared/src/types/subscription.ts` para que `Subscription`, `Payment`, `DashboardSummary` y `NotificationItem` sean `z.infer<typeof ...>` en vez de interfaces sueltas, igual que hace `types/catalog.ts:12-18`. Mantener el comentario que explica por que se llama `NotificationItem` y el que dice que nunca hay campo de PAN.
4. Agregar las dos rutas a `packages/shared/src/api-paths.ts` de forma aditiva y exportar todo lo nuevo desde `index.ts`.
5. Actualizar `packages/api-client`: `notifications.markRead(id)` (PATCH), nuevo recurso `uploads.sign(input)`, y cambiar el tipo de `subscriptions.me()` de `Subscription | null` a `Subscription` (hallazgo 9: la API responde 404, no `null`; el cliente ya convierte no-2xx en `ApiError`).
6. Tests de `packages/shared` (Vitest): que `dashboardSummarySchema` acepte un resumen completo y rechace uno sin `journeyPoints`; que `subscriptionSchema` rechace un `status` invalido; y **el test que importa**: que ni `subscriptionSchema` ni `paymentSchema` ni `createSubscriptionSchema` admitan una clave `number`/`pan`/`cvv` (aserto explicito de la invariante del pago simulado).

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,lint,unit`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck` -- la API ya importa `@oneimpact/shared`; si un tipo derivado quedo incompatible, aparece aca y no tres fases despues.
- Grep de control: `grep -rn "DashboardSummary\|NotificationItem\|subscriptions.me" --include=*.ts --include=*.tsx apps packages | grep -v node_modules` -- confirmar que sigue sin haber consumidores fuera de `api-client`.

**Riesgos**:

- Convertir interfaces en `z.infer` puede cambiar la opcionalidad de un campo sin querer (`canceledAt?`, `readAt?`, `refId?`, `latestUpdate?`): el typecheck de la API lo detecta, pero hay que revisar campo por campo contra el `types/subscription.ts:12-57` original.
- `packages/shared/dist/` existe en el arbol: si `api-client` o la API resuelven contra `dist` en vez de `src`, un tipo nuevo no aparece hasta rebuildear. Si el typecheck falla por "no exported member", rebuildear `shared` antes de dudar del codigo.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(shared): subscription, dashboard and notification response contract`

---

## Fase 2 -- Pago simulado + suscripciones (crear / ver / cancelar)

**Objetivo**: el corazon del item. `POST /v1/subscriptions` simula el pago, activa la suscripcion y emite `subscription.activated`; `GET`/`DELETE /v1/subscriptions/me` completan el ciclo. Al terminar esta fase, `UsersListener` (ya existente) marca `onboardingCompleted` sin haber tocado el modulo `users`: la prueba de que el bus funciona.
**Area**: api
**Archivos** (nuevos salvo indicacion):

- `apps/api/prisma/schema.prisma:119-130` (modelo `Payment`) y `:57-74` (relacion en `User`) -- **modificados**
- `apps/api/prisma/migrations/<ts>_payment_user_and_optional_subscription/`
- `apps/api/src/modules/payments/payments.module.ts`
- `apps/api/src/modules/payments/application/payments.service.ts` + `.spec.ts`
- `apps/api/src/modules/payments/domain/payments.events.ts`
- `apps/api/src/modules/payments/infrastructure/payments.repository.ts`
- `apps/api/src/modules/subscriptions/subscriptions.module.ts`
- `apps/api/src/modules/subscriptions/application/subscriptions.service.ts` + `.spec.ts`
- `apps/api/src/modules/subscriptions/application/subscriptions.listener.ts` + `.spec.ts`
- `apps/api/src/modules/subscriptions/domain/subscriptions.events.ts`
- `apps/api/src/modules/subscriptions/infrastructure/subscriptions.repository.ts`, `subscriptions.mapper.ts`
- `apps/api/src/modules/subscriptions/controllers/subscriptions.controller.ts`
- `apps/api/src/modules/subscriptions/controllers/dto/{create-subscription.dto.ts,subscription.dto.ts}`
- `apps/api/src/app.module.ts:20-25` -- **modificado** (registrar `PaymentsModule`, `SubscriptionsModule`)

**Spec**: `06-...md`, secciones "Modulo `payments`" y "Modulo `subscriptions`"; vault `backend-nest.md:57-60` (reglas del simulador) y `arquitectura-sistema.md`, "Flujo clave" pasos 3-4.
**Shared**: No (consume lo de la fase 1).
**Prisma**: **Si**. Migracion `payment_user_and_optional_subscription` (D1a): `Payment.subscriptionId` pasa a `String?`, se agrega `Payment.userId String` con relacion a `User`, y `User` gana `payments Payment[]`. **Seed: sin cambios** (nunca escribe `Payment`). **MSW: no aplica** (item 07 aun no existe).
**Eventos**: **emite** `payment.succeeded`, `payment.failed` (payments), `subscription.activated`, `subscription.canceled` (subscriptions). **Escucha** `payment.succeeded` / `payment.failed` en `subscriptions` solo para auditoria/log.

**Acciones**:

1. Migracion Prisma segun D1a, con `prisma migrate dev --name payment_user_and_optional_subscription`. **No editar el SQL despues de aplicado.** Regenerar cliente.
2. `PaymentsService.simulate(input)`: reglas exactas del spec -- `last4 === '0000'` -> `FAILED`; `expYear/expMonth` en el pasado (comparado contra el fin del mes de expiracion) -> `FAILED`; resto `SUCCEEDED` tras una latencia artificial de ~800 ms. Persiste `Payment{simulated:true, cardBrand, cardLast4, userId, amount, currency:'USD'}` y publica `payment.succeeded` o `payment.failed` con payload de solo ids + `last4`/`brand`. **La latencia se inyecta como dependencia o constante configurable**, para que el unit test no tarde 800 ms de verdad.
3. `subscriptions.events.ts`: payloads `SubscriptionActivatedPayload { userId, subscriptionId, planId, billing }` y `SubscriptionCanceledPayload { userId, subscriptionId }`. **Debe ser compatible con `UsersListener.SubscriptionActivatedPayload` (`users.listener.ts:12-14`), que solo lee `userId`** -- lo es, porque ese listener declara la forma minima que necesita.
4. `SubscriptionsService.create(userId, input)`: 409 `SUBSCRIPTION_EXISTS` si ya hay una `ACTIVE`; resuelve el `Plan` via `CatalogService` (excepcion sancionada) y calcula el monto en centavos (hallazgo 14); llama a `payments.simulate`; si `FAILED` lanza `DomainError('PAYMENT_DECLINED', 402, ...)` **incluyendo `reason`** y **sin crear suscripcion**; si `SUCCEEDED` crea `Subscription{ACTIVE}` en transaccion, ata el `Payment` a ella y publica `subscription.activated` **pasando `tx`**.
5. `SubscriptionsService.getMine` -> activa o `DomainError.notFound('SUBSCRIPTION_NOT_FOUND', ...)`. `cancelMine` -> `CANCELED` + `canceledAt` + `subscription.canceled` (404 si no hay activa).
6. `SubscriptionsListener`: `@OnEvent(payment.succeeded|payment.failed)` que solo loguea (sin PII: ids, `brand`, `last4`, nunca `holder`). Envuelto en try/catch: **un listener no aborta al emisor**.
7. Controller `@Controller('subscriptions')` (sin `@Public()`): `POST /` con `CreateSubscriptionDto`, `GET /me`, `DELETE /me`, todos con `@CurrentUser()`. Swagger con `@ApiOkResponse({ type: SubscriptionDto })`.
8. Registrar ambos modulos en `app.module.ts`, reemplazando el comentario de `:20-21` por los imports reales.
9. Unit tests obligatorios (regla 30): `payments.service.spec.ts` -- las tres reglas del simulador, `simulated === true` siempre, y que el evento emitido **no contiene ningun campo con el numero de tarjeta**; `subscriptions.service.spec.ts` -- activacion feliz, 402 sin suscripcion creada, 409 con activa existente, cancelacion; `subscriptions.listener.spec.ts` -- que un repo que lanza no propaga la excepcion.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `pnpm --filter @oneimpact/api test -- src/modules/payments src/modules/subscriptions`
- e2e acotado (necesita `pnpm db:up`): `pnpm --filter @oneimpact/api test:e2e -- subscriptions` con el spec nuevo `test/subscriptions.e2e-spec.ts` cubriendo: 201 con tarjeta `4242`, **402 con `last4: '0000'` y `prisma.subscription.count()` sin cambio**, 409 en la segunda, `DELETE` OK, y **401 sin token**.
- Casos negativos obligatorios: 401 sin token en las tres rutas; 402 `PAYMENT_DECLINED` con `reason`; 409 `SUBSCRIPTION_EXISTS`; 404 `SUBSCRIPTION_NOT_FOUND` en `GET /me` sin suscripcion; **400** si el body trae un campo `number` (el schema de `shared` no lo admite).
- Limpieza e2e (hallazgo 13): el spec borra en `afterAll` sus `Payment`, `Subscription` y los usuarios `@oneimpact.test` que registro.
- Pendiente manual: ninguno (fase sin UI).

**Riesgos**:

- La latencia de 800 ms multiplicada por los e2e puede acercarse al `jest.setTimeout(60000)`; parametrizar la latencia por entorno (por ejemplo `PAYMENT_SIMULATION_DELAY_MS`, opcional en `env.ts`, 0 en test) **sin** debilitar el test de la regla.
- Si se acepta D2 opcion (a), el import de `PaymentsService` desde `subscriptions` es exactamente lo que el agente `review/rv-1` marca como violacion de limites: **hay que dejar el comentario justificativo en `payments.module.ts` y la nota en la regla 30 en este mismo commit**, o el review lo reporta como bloqueante.
- `migrate dev` puede pedir confirmacion si la tabla `Payment` tiene filas de pruebas previas en la DB local; esta vacia en una DB recien seedeada.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `feat(api): simulated payments and subscriptions`

---

## Fase 3 -- Escritura de proyectos, avances, follows y firma de subida

**Objetivo**: dar al admin (item 11) y a mobile (08/10) los endpoints de escritura, emitiendo los tres eventos que `projects` ya tiene tipados desde el item 02.
**Area**: api
**Archivos**:

- `apps/api/prisma/schema.prisma:169-182` (`ProjectUpdate.id`) -- **modificado**
- `apps/api/prisma/migrations/<ts>_project_update_generated_id/`
- `apps/api/src/modules/projects/application/projects-writes.service.ts` + `.spec.ts` (nuevo; **no** engordar `projects.service.ts:20-36`, que es el de lectura)
- `apps/api/src/modules/projects/application/follows.service.ts` + `.spec.ts`
- `apps/api/src/modules/projects/infrastructure/projects.repository.ts:22-45` -- **modificado** (metodos de escritura) y `follows.repository.ts` (nuevo)
- `apps/api/src/modules/projects/controllers/admin-projects.controller.ts`, `project-follows.controller.ts`, `uploads.controller.ts` (nuevos)
- `apps/api/src/modules/projects/controllers/dto/{create-project.dto.ts,update-project.dto.ts,publish-update.dto.ts,project-update.dto.ts,signed-upload.dto.ts}`
- `apps/api/src/infra/storage/storage.service.ts` + `storage.module.ts` (nuevos)
- `apps/api/src/infra/config/env.ts:3-13` y `apps/api/.env.example` -- **modificados** (3 variables Supabase opcionales)
- `apps/api/src/modules/projects/projects.module.ts:14-18` -- **modificado**

**Spec**: `06-...md`, seccion "Modulo `projects` (escritura)"; contrato REST del vault `arquitectura-sistema.md` (filas `POST /projects`, `POST /projects/:id/updates`, `POST /projects/:id/follow`).
**Shared**: No (usa `createProjectSchema`, `updateProjectSchema`, `publishUpdateSchema` ya existentes + `uploadSignSchema` de la fase 1).
**Prisma**: **Si**. Migracion `project_update_generated_id` (D3a): `@default(cuid())` en `ProjectUpdate.id`. **Seed: sin cambios** -- sigue pasando sus ids estables explicitos, y el test `seed.e2e-spec.ts:27` que cuenta 5 updates sigue valiendo. **MSW: no aplica**.
**Eventos**: **emite** `project.created`, `project.update_published`, `project.followed`, con los payloads ya tipados en `projects.events.ts:31-56`. **No escucha** nada.

**Acciones**:

1. Migracion `project_update_generated_id` (D3a).
2. `ProjectsWritesService.create(input, adminId)`: deriva el slug segun D4a (con desambiguacion por sufijo), resuelve `zoneId` desde `zoneSlug` en el repositorio con `zone: { slug }` (igual que `projects.repository.ts:26`; **no** inyectar `CatalogService` para esto), 404 `ZONE_NOT_FOUND` si no existe, crea el proyecto con `createdById` y publica `project.created` pasando `tx`.
3. `update(id, input)`: 404 `PROJECT_NOT_FOUND` si no existe. Sin evento (la tabla de eventos del vault no define `project.updated`).
4. `publishUpdate(projectId, input, authorId)`: crea `ProjectUpdate` **y recalcula `Project.progress` con el `progress` del avance, en la misma transaccion**, luego publica `project.update_published` con `{projectId, updateId}` pasando `tx`. `mediaUrl` -> `mediaKey` segun D5a.
5. `FollowsService.follow/unfollow(userId, projectId)`: **idempotentes** -- `upsert` sobre la PK compuesta `[userId, projectId]` (`schema.prisma:191`) y `deleteMany` en el unfollow, de modo que llamar dos veces devuelve lo mismo sin error. `follow` publica `project.followed`; el unfollow **no** emite (no hay evento para eso en la tabla de 8).
6. `StorageService.signUpload(input)`: si las 3 variables Supabase estan, firma contra Supabase Storage; si falta alguna, devuelve la URL local ficticia con `simulated: true` (D6). El servicio vive en `src/infra/storage/` (es infraestructura, no dominio) y se expone via `StorageModule` importado por `ProjectsModule`.
7. Controllers **nuevos y separados** (hallazgo 7): `AdminProjectsController` con `@Roles('ADMIN')` a nivel de clase para `POST /projects`, `PATCH /projects/:id`, `POST /projects/:id/updates`; `ProjectFollowsController` (usuario autenticado, sin `@Roles`) para `POST`/`DELETE /projects/:id/follow`; `UploadsController` con `@Roles('ADMIN')` para `POST /uploads/sign`. **Ninguno lleva `@Public()`.**
8. Unit tests: derivacion y colision de slug; recalculo de `progress` al publicar un avance; `follow` dos veces -> una sola fila; `StorageService` sin credenciales -> respuesta `simulated: true`.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- e2e acotado (`pnpm db:up`): `test/project-writes.e2e-spec.ts` con: admin crea proyecto (201) -> publica avance (201) -> `GET /v1/projects/:id` refleja el nuevo `progress` y el avance; user hace follow dos veces -> `prisma.projectFollow.count()` === 1; unfollow -> 0.
- **Casos negativos obligatorios**: USER hace `POST /v1/projects` -> **403** (criterio de aceptacion del spec); sin token -> **401**; `POST /v1/uploads/sign` con USER -> **403**; body invalido (titulo de 2 caracteres) -> **400**.
- Limpieza e2e (hallazgo 13): borrar en `afterAll` los `ProjectUpdate`, `ProjectFollow` y `Project` creados por el spec, o `seed.e2e-spec.ts:23,27` deja de dar 5 y 5.
- Pendiente manual: probar `POST /v1/uploads/sign` **con** credenciales reales de Supabase queda **SIN CONFIRMAR** hasta el item 14 (deploy); en local solo se ejercita la rama `simulated: true`. Anotarlo explicitamente en el resumen.

**Riesgos**:

- Es la fase que mas superficie agrega (3 controllers, 2 servicios, 1 infra). Si el tiempo aprieta, `POST /uploads/sign` es lo unico recortable sin romper ningun criterio de aceptacion del spec: se documenta como pendiente y el admin (item 11) usa `coverKey` a mano.
- Recalcular `progress` desde el avance sobrescribe lo que el admin haya puesto con `PATCH`; es lo que pide el spec ("recalcula `project.progress`"), pero conviene dejarlo escrito en el doc del use case para que no parezca un bug.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(api): project writes, follows and upload signing`

---

## Fase 4 -- `impact`: puntos de travesia y `GET /dashboard/me`

**Objetivo**: el primer efecto **puramente por evento**: activar una suscripcion crea el punto de travesia sin que `subscriptions` sepa que `impact` existe. Mas el resumen que consume el dashboard de mobile (item 10).
**Area**: api
**Archivos**:

- `apps/api/src/modules/impact/impact.module.ts`
- `apps/api/src/modules/impact/application/impact.listener.ts` + `.spec.ts`
- `apps/api/src/modules/impact/application/dashboard.service.ts` + `.spec.ts`
- `apps/api/src/modules/impact/infrastructure/impact.repository.ts`
- `apps/api/src/modules/impact/controllers/dashboard.controller.ts`
- `apps/api/src/modules/impact/controllers/dto/dashboard-summary.dto.ts`
- `apps/api/src/app.module.ts` -- **modificado**

**Spec**: `06-...md`, seccion "Modulo `impact` (minimo para 10)".
**Shared**: No (usa `dashboardSummarySchema` de la fase 1).
**Prisma**: No.
**Eventos**: **escucha** `subscription.activated` (crea `JourneyPoint`) y `subscription.canceled` (**no hace nada destructivo**: los puntos son permanentes). No emite.

**Acciones**:

1. `ImpactListener.handleSubscriptionActivated`: `upsert` de `JourneyPoint` con la clave natural real **`[userId, month, source]`** (hallazgo 4), `month` = `YYYY-MM` de `occurredAt`, `source: 'SUBSCRIPTION'`, `refId: subscriptionId`. En try/catch, log sin PII, **nunca relanza**.
2. `handleSubscriptionCanceled`: explicitamente vacio, con el comentario de por que (el punto de travesia ya ocurrio y no se borra). Que exista el handler documenta la decision mejor que su ausencia.
3. `ImpactRepository` sobre `PrismaService` (hallazgo 15): cuenta `JourneyPoint`, lee la `Subscription` ACTIVE del usuario, cuenta `ProjectFollow`, busca el `ProjectUpdate` mas reciente entre los proyectos seguidos y cuenta notificaciones con `readAt: null`. **Ningun import de otro modulo de dominio.**
4. `DashboardService.getSummary(userId)` arma el `DashboardSummary`: `plan` via `CatalogService` (excepcion sancionada), `billing`, `status`, `activeMonths` (meses completos desde `startedAt`), `followedProjects`, `latestUpdate?`, `journeyPoints`, `unreadNotifications`. Sin suscripcion activa: `plan/billing/status` en `null` y contadores en 0 -- **200, no 404** (el dashboard existe aunque el usuario no este suscrito).
5. `DashboardController` `@Controller('dashboard')` -> `GET /me`, autenticado, sin `@Roles`.
6. Unit tests obligatorios: **el mismo evento entregado dos veces produce un solo `JourneyPoint`** (test explicito, invariante del spec); el listener no lanza si el repo falla; `activeMonths` con una suscripcion de mes y medio.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `pnpm --filter @oneimpact/api test -- src/modules/impact`
- e2e acotado: tras `POST /v1/subscriptions`, `GET /v1/dashboard/me` devuelve el plan y `journeyPoints: 1`; tras `DELETE /v1/subscriptions/me`, `journeyPoints` sigue en 1 y `status` pasa a reflejar que no hay activa.
- Casos negativos: `GET /v1/dashboard/me` sin token -> **401**.
- Pendiente manual: ninguno.

**Riesgos**:

- `month` calculado con la zona horaria del proceso puede caer en el mes anterior/siguiente cerca del cambio de mes. Fijarlo en UTC y dejarlo escrito; si no, el test de idempotencia es intermitente en la frontera de mes.
- `EventBus` hoy es `emitAsync` sincrono dentro del request: si el listener de `impact` es lento, alarga el `POST /v1/subscriptions`. Aceptable hasta el item 12 (outbox), pero conviene anotarlo.

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(api): impact journey points and dashboard`

---

## Fase 5 -- `notifications`: listeners y endpoints

**Objetivo**: cerrar el fan-out de eventos. Tres listeners idempotentes y los dos endpoints que lee mobile.
**Area**: api
**Archivos**:

- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/src/modules/notifications/application/notifications.listener.ts` + `.spec.ts`
- `apps/api/src/modules/notifications/application/notifications.service.ts` + `.spec.ts`
- `apps/api/src/modules/notifications/infrastructure/notifications.repository.ts`, `notifications.mapper.ts`
- `apps/api/src/modules/notifications/controllers/notifications.controller.ts`
- `apps/api/src/modules/notifications/controllers/dto/notification.dto.ts`
- `apps/api/src/app.module.ts` -- **modificado**

**Spec**: `06-...md`, seccion "Modulo `notifications`".
**Shared**: No (usa `notificationSchema` de la fase 1).
**Prisma**: No.
**Eventos**: **escucha** `user.registered` (bienvenida), `subscription.activated` (plan activo) y `project.update_published` (a los followers). No emite.

**Acciones**:

1. `NotificationsListener` con tres `@OnEvent`. **Cada uno usa un `refId` no nulo** (hallazgo 3): `WELCOME` -> `refId = userId`; `SUBSCRIPTION` -> `refId = subscriptionId`; `PROJECT_UPDATE` -> `refId = updateId`. El `upsert` va sobre `[userId, type, refId]`. Dejar el comentario de por que (los NULL no colisionan en un unique de Postgres) junto al codigo, no solo en el plan.
2. El listener de `project.update_published` resuelve los followers **con su propio repositorio** (`prisma.projectFollow.findMany`), no llamando a `projects` (hallazgo 15), y crea una notificacion por follower. Copy **en espanol** (`"Nuevo avance en <proyecto>"`), codigo en ingles.
3. Los tres listeners: try/catch, log sin PII, **nunca relanzan**.
4. `NotificationsService.listMine(userId)` -> `{ items, total }` ordenado por `createdAt desc`; `markRead(userId, id)` -> 404 `NOTIFICATION_NOT_FOUND` si no existe **o si es de otro usuario** (no filtrar por `userId` seria un IDOR: una notificacion ajena marcada como leida).
5. `NotificationsController`: `GET /notifications/me`, `PATCH /notifications/:id/read`, autenticados.
6. Unit tests obligatorios: **cada uno de los tres eventos entregado dos veces -> una sola notificacion** (criterio de aceptacion explicito del spec para `project.update_published`); `markRead` de una notificacion ajena -> 404; el listener no lanza si el repo falla.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit`
- `pnpm --filter @oneimpact/api test -- src/modules/notifications`
- e2e acotado: registro + suscripcion -> `GET /v1/notifications/me` devuelve **2 items** (`WELCOME` + `SUBSCRIPTION`); admin publica un avance de un proyecto seguido -> el follower recibe **1** notificacion `PROJECT_UPDATE`.
- Casos negativos: sin token -> **401**; `PATCH /v1/notifications/:id/read` sobre una notificacion de otro usuario -> **404**.
- Pendiente manual: ninguno.

**Riesgos**:

- El fan-out a followers es N escrituras dentro del request del admin (sin outbox todavia). Con el seed (pocos followers) es irrelevante; anotarlo como motivo adicional para el item 12.
- Si un listener de esta fase se escribe con `refId` nulo, el test de idempotencia puede pasar contra mocks y fallar contra Postgres real. Ejecutar el e2e de esta fase contra Postgres antes de dar el checkpoint por bueno.

CHECKPOINT -- Detente aca. No inicies la Fase 6 sin aprobacion.
**Commit sugerido**: `feat(api): notifications listeners and endpoints`

---

## Fase 6 -- e2e del flujo completo, bateria total y AI log

**Objetivo**: demostrar los cinco criterios de aceptacion del spec de punta a punta, dejar el arbol verde en todos los scopes y registrar la sesion.
**Area**: api
**Archivos**:

- `apps/api/test/subscriptions-flow.e2e-spec.ts` (nuevo: el flujo completo, complementa los specs acotados de las fases 2-5)
- `apps/api/test/utils/auth-helpers.ts` -- **modificado** si hace falta un helper de "usuario suscrito"
- `docs/ai-workflow.md` -- **modificado** (via `/ai-log`)
- `.claude/roadmap/ROADMAP.md` -- **modificado** (marcar el item 06 como hecho con su rango de commits)

**Spec**: `06-...md`, seccion "Criterios de aceptacion (e2e)".
**Shared**: No. **Prisma**: No. **Eventos**: No (solo los ejercita).

**Acciones**:

1. `test/subscriptions-flow.e2e-spec.ts`, un `it` por criterio de aceptacion:
   - register -> `POST /v1/subscriptions` con `4242` -> **201**; `GET /v1/dashboard/me` muestra el plan y **1** journey point; `GET /v1/notifications/me` devuelve **2** items.
   - tarjeta terminada en `0000` -> **402**, **sin** suscripcion creada y **sin** journey point (asertar con `prisma.subscription.count` / `prisma.journeyPoint.count` sobre ese usuario, no solo el status code).
   - segunda suscripcion -> **409**; `DELETE /v1/subscriptions/me` -> `CANCELED` y el journey point **sigue existiendo**.
   - admin publica un avance de un proyecto que el usuario sigue -> el follower recibe la notificacion.
   - USER hace `POST /v1/projects` -> **403**.
2. Limpieza total en `afterAll` (hallazgo 13): notificaciones, journey points, pagos, suscripciones, follows, updates, proyectos creados por el spec y usuarios `@oneimpact.test`. Verificar despues que `pnpm --filter @oneimpact/api test:e2e` completo (incluido `seed.e2e-spec.ts`) sigue verde **corriendo dos veces seguidas** sin resembrar: si la segunda pasada falla, la limpieza esta incompleta.
3. `bash scripts/dev/quality-check.sh --scope all` (bateria completa, una sola vez, como manda la regla 50).
4. Actualizar la tabla de Estado de `.claude/roadmap/ROADMAP.md` con el item 06 hecho y su rango de commits.
5. `/ai-log` con la entrada de la sesion en `docs/ai-workflow.md`: que se pidio, que entrego la IA, que se reviso a mano, y **explicitamente** las decisiones D1-D6 y como se resolvieron (es el entregable que evalua la prueba).
6. Opcional pero recomendado antes de mergear: `/review-pr` para que `rv-1` valide los limites de modulo (sobre todo la excepcion `payments` de D2) y `rv-2` la invariante del pago simulado.

**Verificacion** (acotada a la fase):

- `bash scripts/dev/quality-check.sh --scope all` -> `[OK]` en todos los pasos. El paso `e2e (api)` requiere `pnpm db:up`; si aparece `[SKIP]` por Postgres caido, **la fase no esta cerrada**.
- `pnpm --filter @oneimpact/api test:e2e` dos veces seguidas, verde ambas.
- Casos negativos: cubiertos por los cinco criterios (403, 402, 409, 401).
- Pendiente manual a anotar en el resumen: firma real de subida contra Supabase Storage (**SIN CONFIRMAR** hasta el item 14) y la verificacion visual de estos endpoints desde mobile (items 09/10).

**Riesgos**:

- `--scope all` incluye `bundle` de mobile (`expo export`), que es lento y ajeno a este item; si falla por algo de mobile mergeado en paralelo en la ola 3, **no se arregla en esta rama**: se reporta y se resuelve en `/merge-plan`.
- Las lanes 08 y 11 corren en paralelo sobre `main`; al mergear, el conflicto probable esta en `apps/api/src/app.module.ts` y en `packages/shared/src/index.ts`. Ambos son conflictos de linea de import, no de logica.

CHECKPOINT -- Detente aca. Fin del plan.
**Commit sugerido**: `test(api): payments, subscriptions and events e2e coverage`
