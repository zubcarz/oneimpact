# Plan -- API: outbox transaccional y metricas del admin (por fases, checkpoint por fase)

> **Fecha**: 2026-08-24
> **Origen**: Modo R -- spec del roadmap `.claude/roadmap/specs/12-api-dashboard-metrics-and-outbox.md` (item 12, ola 5/Fase 2, depende de 06 que ya esta en `main`, mergeado en `d0fab7b`).
> **Base**: vault `01-Tecnologia-Arquitectura/backend-nest.md` (seccion "Eventos de dominio", patron Outbox, "Pago simulado"); reglas `30-api-event-driven.md` y `50-testing-and-verification.md`. Plan previo: `.claude/plans/20260822-api-payments-subscriptions-events.plan.md` (deja el terreno preparado: `EventBus.publish(event, tx?)` con firma definitiva, `SubscriptionsRepository.runTransaction`, comentarios "item 12" en varios archivos).
> **Areas**: api + shared (`packages/shared`, mínimo)
> **Contrato shared tocado**: **Si**, aditivo. `src/api-paths.ts` (1 ruta nueva: `admin.outbox`; `admin.metrics` **ya existe** desde el item 06/11), `src/schemas/admin.ts` + `src/types/admin.ts` nuevos (`adminMetricsSchema`, `outboxEventSchema`). Consumidores verificados por grep: **ninguno todavia** -- `apps/admin` los consume recien en el item 13 (`GET /v1/admin/metrics` y `/v1/admin/outbox` no se usan hoy en ningun cliente). Cero riesgo de romper algo existente.
> **Schema Prisma tocado**: **Si**, una migracion aditiva: `outbox_last_error` (agrega `OutboxEvent.lastError String?`). `OutboxEvent.attempts` **ya existe** desde la migracion `domain_model` del item 06 -- ver hallazgo 1. El seed no cambia (nunca escribe `OutboxEvent`).
> **Eventos**: no se agrega ningun evento nuevo a la tabla de 8. Cambia **el transporte interno** de los 8 existentes: hoy `EventBus.publish` hace `emitAsync` sincrono; despues de este plan inserta una fila en `OutboxEvent` y un `OutboxRelay` por intervalo la entrega. Ningun modulo de dominio (`payments`, `subscriptions`, `projects`, `auth`) cambia su codigo de publicacion mas alla de lo que ya hicieron en el item 06 (que ya pasa `tx` donde corresponde).
> **Zonas de riesgo**: eventos/listeners (la entrega deja de ser sincrona: hay e2e existentes que asertan efectos justo despues del POST y se rompen si no se ajustan -- ver hallazgo 5), auth/roles (dos endpoints ADMIN nuevos, caso negativo 403 obligatorio).
> **Fase del roadmap**: Fase 2 (item 12, ola 5 si entraba el domingo 23 o, si no, primer item de Fase 2 -- segun `ROADMAP.md` el domingo no alcanzo, asi que corre ahora). Sin presion de la entrega del lunes 24 ago 18:00 (esa es Fase 1).
> **Como ejecutar**: `/run-plan-worktree` (lo indica el spec: `feat/api-dashboard-metrics-and-outbox`; toca `schema.prisma`, necesita su propio worktree y Postgres local serializado contra cualquier otra lane que migre).

## Objetivo

Cerrar la arquitectura a eventos con el patron Outbox real (durable, entregado
por un relay periodico, listeners idempotentes ante reintento) sin romper el
contrato de `EventBus.publish(event, tx?)` que ya usan `payments` y
`subscriptions`; y exponer dos endpoints ADMIN nuevos para la demo de
arquitectura: `GET /v1/admin/metrics` (conteos agregados) y
`GET /v1/admin/outbox` (ultimos 50 eventos con su estado).

## Contexto y hallazgos del analisis

### Lo que ya existe y no hay que reinventar

- `EventBus.publish(event, tx?)` en `apps/api/src/infra/events/event-bus.ts:28-36` tiene la firma **definitiva**. Hoy ignora `tx` y hace `emitAsync` directo; el propio doc de la clase (`event-bus.ts:6-23`) dice explicitamente que este item solo cambia el CUERPO del metodo, no la firma ni los call sites.
- `EventsModule` (`apps/api/src/infra/events/events.module.ts`) ya es `@Global()` y **ya esta registrado** en `AppModule` (`apps/api/src/app.module.ts:9,21`). El doc de la clase (`events.module.ts:11-13`) dice "not wired into AppModule yet" -- esta **desactualizado**, gana el codigo (regla `00-base-rules.md` #4): se corrige el comentario en la fase 1, no hay trabajo de wiring pendiente.
- `SubscriptionsService.create`/`cancelMine` (`apps/api/src/modules/subscriptions/application/subscriptions.service.ts:66-87,106-117`) **ya** envuelve la escritura + `eventBus.publish(event, tx)` dentro de `repository.runTransaction`. Este modulo queda intacto: es exactamente el patron que el resto debe seguir.
- `PaymentsService.simulate` (`apps/api/src/modules/payments/application/payments.service.ts:59-103`) **todavia no** usa transaccion: crea el `Payment` y publica el evento como dos llamadas sueltas, sin `tx`. Es el unico use case de 06 que falta alinear -- ver hallazgo 2.
- `OutboxEvent` ya existe en `schema.prisma:237-246` con `id, type, payload, createdAt, processedAt, attempts` -- **`attempts` ya esta migrado** (migracion `20260822193637_domain_model`). El spec pide una migracion `outbox_attempts` que ya no hace falta (ver hallazgo 1 y decision D1).
- Patron de repositorio-unico-por-modulo ya establecido: `SubscriptionsRepository`, `PaymentsRepository`, `ImpactRepository` son el UNICO punto que toca `PrismaService` en su modulo. Este plan sigue el mismo patron para `infra/events` (`OutboxRepository`) e `impact` (`AdminMetricsRepository` nuevo, separado de `ImpactRepository` para no mezclar la responsabilidad de "dashboard de un usuario" con "metricas agregadas del admin").
- Guards globales ya cableados (`AuthModule`, `apps/api/src/modules/auth/auth.module.ts:65-66`): un controller nuevo sin `@Public()` ya esta protegido; `@Roles(Role.ADMIN)` a nivel de clase ya tiene precedente exacto en `AdminUsersController` (`apps/api/src/modules/users/controllers/admin-users.controller.ts:20-23`).
- Patron DTO ya establecido: schema zod en `packages/shared` -> `createZodDto` (`apps/api/src/modules/impact/controllers/dto/dashboard-summary.dto.ts`). Se sigue igual para los DTOs nuevos.
- `packages/shared/src/api-paths.ts:32-36` **ya tiene** `admin.metrics: '/v1/admin/metrics'` (dejado por un item anterior, sin uso todavia). Falta agregar `admin.outbox`.
- e2e: `test/utils/create-test-app.ts`, `test/utils/auth-helpers.ts` (`loginAs(app, 'admin'|'user')`, `registerTestUser`), `test/utils/seed-once.ts`. `jest-e2e.json` fija `maxWorkers: 1`. El patron de setear una env var como PRIMERA linea del archivo (antes de cualquier `import`) para que tome efecto antes de que `ConfigModule.forRoot({validate: validateEnv})` la lea, ya existe en `test/subscriptions-flow.e2e-spec.ts:1-12` (`PAYMENT_SIMULATION_DELAY_MS='0'`). Se reutiliza igual para `OUTBOX_RELAY_INTERVAL_MS`.

### Hallazgos que cambian el diseno

1. **La migracion `outbox_attempts` que sugiere el spec ya no aplica.** `OutboxEvent.attempts` esta en el schema y migrado desde el item 06 (`schema.prisma:243`, migracion `20260822193637_domain_model`). Lo unico que falta para "en error, `attempts++` y `lastError`" es la columna `lastError` -- una migracion mas chica que la que el spec anticipaba. Ver decision D1 sobre si tambien hace falta un campo `status` persistido.

2. **`PaymentsService.simulate` es el unico use case de 06 sin transaccion.** Publica dos eventos (`payment.succeeded`/`payment.failed`) sin `tx`, en `payments.service.ts:74-80,96-100`. Con el outbox real, publicar SIN `tx` significa: si el proceso muere entre `repository.create` y `eventBus.publish`, el `Payment` queda escrito pero el evento se pierde -- exactamente el bug que el patron Outbox existe para evitar. Hay que envolver ambos casos (`FAILED` y `SUCCEEDED`) en `repository.runTransaction`, igual que `subscriptions`. Esto toca `PaymentsRepository.create` (agregar `tx` como primer parametro) y `payments.service.spec.ts` (los mocks de `eventBus.publish` hoy esperan que se llame SIN segundo argumento -- `payments.service.spec.ts:86-166` -- pasan a esperar el mismo patron que ya usa `subscriptions.service.spec.ts:117` con `runTransaction: jest.fn((work) => work({}))`).

3. **El relay no puede ser `@Interval` de `@nestjs/schedule` sin gestionar el apagado en los tests.** El vault sugiere literalmente `OutboxRelay (@Interval(1000))`, pero `@nestjs/schedule` no limpia sus timers al llamar `app.close()` salvo que la app tenga `enableShutdownHooks()` activado -- y ningun test helper de este repo lo activa (`test/utils/create-test-app.ts:17-28` no lo llama, ni tendria sentido agregarlo solo para esto). Cada `describe` de cada archivo e2e llama `createTestApp()` en su propio `beforeEach`/`beforeAll` y cierra con `app.close()` en `afterEach`/`afterAll`; con `maxWorkers: 1` todos los archivos e2e corren en el mismo proceso Node, asi que timers que sobreviven a un `app.close()` se acumulan durante toda la corrida de la suite y siguen disparando contra una `PrismaService` ya desconectada. Ver decision D2.

4. **No existe ningun controller dentro de un modulo `infra/*` hoy.** Los cuatro modulos de infra (`prisma`, `events`, `storage`, `config`) son puramente de soporte, sin rutas HTTP. `GET /v1/admin/outbox` expone estado interno del bus de eventos, no un concepto de dominio de `impact` ni de ningun otro modulo -- ver decision D3 sobre donde vive.

5. **Entrega asincrona rompe una aserción existente.** `test/subscriptions-flow.e2e-spec.ts:139-166` (`'registers a user, subscribes... and the dashboard and notifications reflect the events'`) hace `POST /v1/subscriptions` y **inmediatamente despues**, sin esperar, pide `GET /v1/dashboard/me` y `GET /v1/notifications/me` esperando `journeyPoints: 1` y 2 notificaciones. Hoy pasa porque `publish()` entrega sincronicamente antes de que el POST responda. Con el outbox real, la entrega ocurre en el proximo tick del relay (config gable, pero nunca instantanea): este test **se vuelve flaky/rojo** tal como esta escrito. Mismo archivo, test `'notifies a follower... when an admin publishes an update'` (linea 215-244), mismo problema. Es el UNICO archivo e2e del repo con este patron (verificado: `grep` en `project-writes.e2e-spec.ts` y `users.e2e-spec.ts` no encontro aserciones dependientes de entrega de evento inmediata). Se resuelve en la fase 3 con un helper de polling (`waitFor`) en vez de debilitar el assert.

6. **`nestjs-pino` no es una dependencia hoy.** `apps/api/package.json` no lo lista; el logging actual es el `Logger` de `@nestjs/common` usado directo en los listeners (`SubscriptionsListener`, `ImpactListener`, etc.) y `console.log` en `main.ts:24`. El punto "Observabilidad" del spec (`nestjs-pino` con request-id) es una dependencia nueva -- unica de todo este plan. Ver decision D7.

## Decisiones RESUELTAS (2026-08-24, Carlos vía Auto Mode)

Se resuelven todas con la opcion recomendada (a); se listan las alternativas
descartadas para que la entrada de `docs/ai-workflow.md` (fase 5) explique el
porque. Si Carlos prefiere otra opcion al revisar, se ajusta en el checkpoint
de la fase correspondiente antes de continuar.

**D1 -- Campo(s) nuevo(s) en `OutboxEvent` para distinguir `FAILED` tras 5 intentos.**

- (a) **[ELEGIDA]**: solo se agrega `lastError String?` (migracion `outbox_last_error`). El estado (`PENDING`/`PROCESSED`/`FAILED`) se **deriva en lectura** a partir de `processedAt`/`attempts` (`PROCESSED` si `processedAt` no es null; `FAILED` si es null y `attempts >= 5`; `PENDING` en el resto) tanto en el DTO de `GET /v1/admin/outbox` como en la condicion `WHERE` del relay (`processedAt IS NULL AND attempts < 5`, que es literalmente lo que implementa "tras 5 intentos deja de reintentar"). Evita una segunda fuente de verdad (un campo `status` que podria desincronizarse de `processedAt`/`attempts`) y una migracion + enum de mas.
- (b) Agregar tambien `status OutboxStatus` persistido con su propio enum. Mas fiel al texto literal del spec, pero duplica informacion que ya existe en dos columnas y agrega superficie de migracion sin necesidad real.

**D2 -- Mecanismo del relay: `@nestjs/schedule` (`@Interval`) vs `setInterval` propio.**

- (a) **[ELEGIDA]**: `OutboxRelay` implementa `OnModuleInit`/`OnModuleDestroy` con `setInterval`/`clearInterval` de Node puro. `OnModuleDestroy` se ejecuta automaticamente con `app.close()`, sin requerir `enableShutdownHooks()`. Cero dependencia nueva para esto. Vinculado al hallazgo 3.
- (b) `@nestjs/schedule` con `@Interval(1000)`, como sugiere el vault literalmente. Requeriria agregar `enableShutdownHooks()` a `main.ts` **y** a `test/utils/create-test-app.ts` para lograr el mismo resultado, mas una dependencia nueva -- mas superficie para el mismo comportamiento observable.

**D3 -- Donde vive `GET /v1/admin/outbox`.**

- (a) **[ELEGIDA]**: controller nuevo `OutboxAdminController` dentro de `infra/events/controllers/`, registrado en `EventsModule` (que ya es `@Global()` y ya esta en `AppModule`; agregar `controllers: [OutboxAdminController]` no requiere tocar `app.module.ts`). El outbox es un concern de infraestructura de entrega de eventos, no un dominio de negocio de `impact`; forzarlo ahi solo porque el spec agrupa "Outbox" y "Metricas" bajo el mismo item de roadmap mezclaria responsabilidades sin relacion.
- (b) Meterlo en `impact` junto a `admin/metrics`, como agrupa el spec textualmente. Mas rapido de cablear pero contamina un modulo de dominio (impact = travesia del usuario) con estado interno del bus de eventos que no le pertenece.

**D4 -- `avgProgressByZone`: recalculado por listener vs on-read.**

- (a) **[ELEGIDA, es el default que el propio spec sugiere]**: se calcula on-read, cacheado 30 s junto con el resto de `admin/metrics`. Sin estado nuevo, sin listener nuevo; el cache en memoria ya resuelve el costo de recalcular en cada request. Se implementa con `prisma.zone.findMany({ select: { id, slug, name, projects: { select: { progress: true } } } })` y el promedio se calcula en JS -- da el join con el nombre de la zona gratis, sin `groupBy` + una consulta aparte para los nombres.
- (b) Listener sobre `project.update_published` que mantiene una tabla agregada. Mas trabajo, otra fuente de verdad para sincronizar, sin necesidad real dado el volumen de la demo (5 zonas, 5 proyectos del seed).

**D5 -- Como se calcula `mrrSimulated`.**

- (a) **[ELEGIDA]**: se computa sobre `Subscription{status: ACTIVE}` + su `Plan`, usando `monthlyPriceFor(plan, billing)` de `@oneimpact/shared` (el mismo helper que ya usa `SubscriptionsService.amountInCents`, `subscriptions.service.ts:143-147`), sumado en centavos. Es un MRR real: refleja el ingreso mensual recurrente de las suscripciones activas AHORA.
- (b) Sumar `Payment.amount` de pagos `SUCCEEDED`. Mas simple pero semanticamente incorrecto: mezclaria cobros anuales de una sola vez con mensuales y no reflejaria cancelaciones.

**D6 -- Numeracion del ADR sugerido por el spec ("adr-006").**

- (a) **[ELEGIDA]**: `docs/adr/003-outbox-and-queue-transport.md`. `docs/adr/` solo tiene `001` y `002` hoy; "006" en el spec referencia casi seguro la numeracion de decisiones internas (`D6`) de otro plan (`20260822-api-payments-subscriptions-events.plan.md`), no un ADR real. Se sigue la numeracion secuencial real del directorio (regla `00-base-rules.md` #4: ante conflicto entre doc y estado real, gana el estado real).
- (b) Nombrar el archivo `006-...` tal cual dice el spec, dejando un hueco `003-005` sin explicacion.

**D7 -- Agregar `nestjs-pino` o simular con el `Logger` de Nest.**

- (a) **[ELEGIDA]**: se agrega `nestjs-pino` + `pino-http` (unica dependencia nueva de este plan), pero el cambio se limita a `LoggerModule.forRootAsync` (`infra/logging/logging.module.ts` nuevo) + `app.useLogger(app.get(Logger))` en `main.ts`. Cero cambios en los `new Logger(ClassName)` que ya usan `SubscriptionsListener`, `ImpactListener`, etc.: `useLogger` reemplaza el logger global de Nest sin tocar esos call sites. `test/utils/create-test-app.ts` **no** llama `useLogger` a proposito (decision explicita, no descuido): los e2e siguen con el logger por defecto de Nest, mas silencioso, en vez de inundar la salida de la suite con JSON de pino.
- (b) No agregar la dependencia, dejar el `Logger` de Nest tal cual con mensajes mas descriptivos. No cumple el punto "Observabilidad" del spec (`nestjs-pino`, request-id) ni deja logs estructurados.

## Principios

- Aditivo antes que destructivo: nueva migracion solo agrega una columna nullable; `packages/shared` solo agrega archivos y una clave de `api-paths`, no toca nada consumido hoy.
- La firma `EventBus.publish(event, tx?)` **no cambia**. Ningun modulo de dominio (`payments` aparte, por el hallazgo 2) toca su codigo de publicacion.
- Verde por fase, en el alcance de la fase -- **con una excepcion explicita**: entre la fase 1 (outbox core) y la fase 3 (donde se ajusta `subscriptions-flow.e2e-spec.ts`), la bateria `e2e` de `apps/api` queda **rota a proposito** por el hallazgo 5. Las fases 1 y 2 declaran su verificacion como `typecheck,lint,unit` unicamente -- **no correr `--only e2e` en esas fases**, es un rojo esperado, no una regresion a diagnosticar. La bateria `--scope all` corre una sola vez, al cierre (fase 5).
- Los schemas de validacion/respuesta viven una sola vez en `packages/shared`.
- Los modulos se hablan por eventos; unicas excepciones sancionadas: `catalog` y `payments` desde `subscriptions` (ya documentadas, sin cambios).
- Listeners existentes **no se tocan**: siguen siendo idempotentes por upsert en clave natural y nunca lanzan hacia el emisor. Lo unico que cambia es CUANDO se disparan (por el relay, no por `publish` sincrono).
- El PAN nunca llega al servidor ni a un log: ningun payload de evento ni log de este plan incluye datos de tarjeta mas alla de `brand`/`last4`, ya presentes desde el item 06.
- Sin `eslint-disable`, sin `@ts-ignore`, sin debilitar tests para ir a verde -- el ajuste del hallazgo 5 usa un helper de polling con timeout, no un `sleep` fijo ni un assert mas laxo.
- Copy visible al usuario en espanol (no aplica: este plan no toca UI); codigo, rutas, identificadores y commits en ingles. Sin emojis.

## Mapa de fases

| Fase | Nombre                                                                                    | Area         | Impacto                                         | Shared                                               | Prisma                       | Commit sugerido                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------- | ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 0    | Pre-flight (solo lectura)                                                                 | --           | Ninguno                                         | No                                                   | No                           | _(sin commit)_                                                                                                     |
| 1    | Outbox core: insercion transaccional + relay + fault injector de test                     | api          | Aditivo (rompe e2e a proposito, ver Principios) | No                                                   | **Si** (`outbox_last_error`) | `feat(api): transactional outbox insert and interval relay`                                                        |
| 2    | `payments` publica dentro de transaccion (alinea con `subscriptions`)                     | api          | Aditivo                                         | No                                                   | No                           | `fix(api): wrap payment creation and event publish in a transaction`                                               |
| 3    | `GET /v1/admin/outbox` + ajuste de e2e a entrega asincrona + e2e de durabilidad/reintento | api + shared | Aditivo                                         | Si (api-paths + schema outbox)                       | No                           | `feat(api): admin outbox endpoint and durability e2e coverage`                                                     |
| 4    | `GET /v1/admin/metrics` con cache en memoria de 30 s                                      | api + shared | Aditivo                                         | Si (api-paths ya tenia la ruta; schema+types nuevos) | No                           | `feat(api): admin metrics endpoint`                                                                                |
| 5    | Observabilidad (`nestjs-pino`), ADR-003, bateria completa y AI log                        | api + docs   | Aditivo                                         | No                                                   | No                           | `feat(api): structured logging for event publish and delivery` + `docs: adr-003 outbox and future queue transport` |

---

## Fase 0 -- Pre-flight (solo lectura)

**Objetivo**: confirmar el punto de partida antes de tocar el bus de eventos.
**Area**: --
**Archivos**: ninguno (solo lectura).
**Shared**: No
**Prisma**: No
**Eventos**: No

**Acciones**:

1. Confirmar que la rama base es `main` con el item 06 mergeado (`d0fab7b` o posterior) y que el worktree de este plan es `feat/api-dashboard-metrics-and-outbox`.
2. Levantar Postgres (`pnpm db:up`) y confirmar `prisma migrate status` sin drift antes de agregar la migracion `outbox_last_error`.
3. Correr `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit,e2e` una vez para tener la linea base verde documentada (el commit del checkpoint de fase 1 la deja rota a proposito en `e2e`, segun Principios -- hay que poder decir "estaba verde antes").

**Verificacion**: la corrida del paso 3 completa sin `[FAIL]`.

CHECKPOINT -- Detente aca. No inicies la Fase 1 sin aprobacion.

---

## Fase 1 -- Outbox core: insercion transaccional + relay + fault injector de test

**Objetivo**: `EventBus.publish` pasa a insertar en `OutboxEvent` (dentro de `tx` si se pasa una); un `OutboxRelay` por intervalo toma lotes no procesados y los entrega via `EventEmitter2`, marcando `processedAt` o incrementando `attempts`/`lastError`. Se agrega un mecanismo de fallo simulado para los e2e de la fase 3.
**Area**: api
**Archivos**:

- `apps/api/prisma/schema.prisma:237-246` (agregar `lastError String?` a `OutboxEvent`)
- `apps/api/prisma/migrations/<timestamp>_outbox_last_error/migration.sql` (nueva)
- `apps/api/src/infra/config/env.ts:1-32` (agregar `OUTBOX_RELAY_INTERVAL_MS` default `1000`, `OUTBOX_RELAY_BATCH_SIZE` default `20`, `OUTBOX_MAX_ATTEMPTS` default `5`, todos `z.coerce.number().int()`)
- `apps/api/.env.example` (documentar las tres, junto a `PAYMENT_SIMULATION_DELAY_MS`)
- `apps/api/src/infra/events/outbox.repository.ts` (nuevo -- unico punto que toca `PrismaService` para `OutboxEvent`: `insert(event, tx?)`, `findPendingBatch(limit, maxAttempts)`, `markProcessed(id)`, `markFailedAttempt(id, error)`, `listRecent(limit)`)
- `apps/api/src/infra/events/outbox-fault-injector.ts` (nuevo -- `@Injectable()`, `failNextDeliveryOnce(type: string): void` y `shouldFail(type: string): boolean` que consume el flag una sola vez; sin estado por defecto, nunca falla nada en produccion)
- `apps/api/src/infra/events/outbox.relay.ts` (nuevo -- `@Injectable() implements OnModuleInit, OnModuleDestroy`; `setInterval`/`clearInterval` propio, ver decision D2; por tick: toma el batch, por cada fila intenta `faultInjector.shouldFail(type) ? throw : emitter.emitAsync(type, payload)`, en exito `markProcessed`, en error `markFailedAttempt` y loguea `type`, `id`, `ms` sin el payload completo -- adelanta el punto "Observabilidad" del spec para esta pieza especifica, el resto va en la fase 5)
- `apps/api/src/infra/events/event-bus.ts:1-37` (reescribir `publish`: `await this.outbox.insert(event, tx)`; actualizar el doc de la clase, ya no dice "TODAY... item 12 not done yet")
- `apps/api/src/infra/events/event-bus.spec.ts` (reescribir: ya no verifica entrega sincrona a un `@OnEvent`, verifica que `publish` inserta una fila via un `OutboxRepository` mockeado, con y sin `tx`)
- `apps/api/src/infra/events/outbox.relay.spec.ts` (nuevo -- unit: entrega exitosa marca `processedAt`; una entrega fallida incrementa `attempts` y setea `lastError` sin marcar `processedAt`; una fila con `attempts >= OUTBOX_MAX_ATTEMPTS` no aparece en el proximo batch; `onModuleDestroy` limpia el intervalo -- `jest.useFakeTimers()`)
- `apps/api/src/infra/events/events.module.ts` (agregar `OutboxRepository`, `OutboxRelay`, `OutboxFaultInjector` a `providers`/`exports`; corregir el doc desactualizado del hallazgo -- ya esta en `AppModule`)

**Shared**: No
**Prisma**: Si -- migracion `outbox_last_error` (`ALTER TABLE "OutboxEvent" ADD COLUMN "lastError" TEXT;`). Aplicar con `pnpm --filter @oneimpact/api prisma:migrate -- --name outbox_last_error`. Sin cambios de seed (el seed nunca escribe `OutboxEvent`).
**Eventos**: cambia el transporte de los 8 existentes; ninguno nuevo.

**Acciones**:

1. Migracion Prisma para `lastError`.
2. `OutboxRepository` con los 5 metodos listados arriba. `findPendingBatch` filtra `processedAt IS NULL AND attempts < :maxAttempts`, ordena por `createdAt` asc, limita por `:batchSize` -- esto ES la implementacion de "tras 5 intentos lo deja en FAILED" (decision D1): la fila deja de aparecer en los batches, sin campo de estado adicional.
3. `OutboxFaultInjector` minimo: un `Map<string, number>` en memoria (tipo evento -> cantidad de fallos pendientes a simular), `failNextDeliveryOnce(type)` incrementa, `shouldFail(type)` decrementa si > 0 y devuelve `true`, si no `false`. Nunca se popula en produccion: nada fuera de un test lo llama.
4. `OutboxRelay` con `OnModuleInit` (arranca el `setInterval` leyendo `OUTBOX_RELAY_INTERVAL_MS`/`OUTBOX_RELAY_BATCH_SIZE`/`OUTBOX_MAX_ATTEMPTS` de `ConfigService`) y `OnModuleDestroy` (`clearInterval`). Cada tick es `async` y se auto-serializa (no dispara un segundo tick si el anterior sigue corriendo) para no generar consultas superpuestas si el batch tarda mas que el intervalo.
5. Reescribir `EventBus.publish` para insertar en vez de emitir. Actualizar su doc de clase.
6. Reescribir `event-bus.spec.ts` y agregar `outbox.relay.spec.ts`.
7. Registrar los 3 providers nuevos en `EventsModule`, corregir su comentario de clase.

**Verificacion** (acotada a la fase, sin `e2e` -- ver Principios):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit --filter infra/events`

**Riesgos**:

- A partir de esta fase, `bash scripts/dev/quality-check.sh --scope api --only e2e` da rojo (hallazgo 5). Es esperado hasta la fase 3; no diagnosticar como regresion.
- `jest.useFakeTimers()` en `outbox.relay.spec.ts` tiene que avanzarse manualmente (`jest.advanceTimersByTime`) y restaurarse en `afterEach` (`jest.useRealTimers()`), o contamina otros archivos de la suite unit si Jest los corre en el mismo worker.

CHECKPOINT -- Detente aca. No inicies la Fase 2 sin aprobacion.
**Commit sugerido**: `feat(api): transactional outbox insert and interval relay`

---

## Fase 2 -- `payments` publica dentro de transaccion

**Objetivo**: alinear `PaymentsService.simulate` con el patron que `subscriptions` ya usa desde el item 06 (hallazgo 2), para que la escritura del `Payment` y la insercion del evento en el outbox sean atomicas.
**Area**: api
**Archivos**:

- `apps/api/src/modules/payments/infrastructure/payments.repository.ts:25-32` (agregar `runTransaction<T>(work)` igual que `SubscriptionsRepository.runTransaction`; `create` pasa a recibir `tx: Prisma.TransactionClient` como primer parametro)
- `apps/api/src/modules/payments/application/payments.service.ts:59-103` (ambas ramas -- `FAILED` y `SUCCEEDED` -- envuelven `repository.create` + `eventBus.publish(event, tx)` en `repository.runTransaction`)
- `apps/api/src/modules/payments/application/payments.service.spec.ts` (actualizar los mocks: `repository = { create: jest.fn(), runTransaction: jest.fn((work) => work({})) }`, igual patron que `subscriptions.service.spec.ts:51-53`; los `expect(eventBus.publish).toHaveBeenCalledWith(...)` dejan de aceptar 1 argumento y pasan a aceptar 2, el segundo un objeto de transaccion falso)

**Shared**: No
**Prisma**: No
**Eventos**: sin cambios de nombre/payload -- solo cambia que ahora viajan con `tx`.

**Acciones**:

1. `PaymentsRepository.runTransaction` + `create(tx, input)`.
2. `PaymentsService.simulate`: mover la logica de cada rama dentro de `repository.runTransaction(async (tx) => { ... })`.
3. Actualizar `payments.service.spec.ts` (los 4 `it` que verifican `eventBus.publish` y los 2 que verifican que NO se llama en casos que ni siquiera llegan a `runTransaction`, ver lineas 152 y 178 del archivo actual).

**Verificacion** (acotada a la fase, sin `e2e`):

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit --filter payments`

**Riesgos**: ninguno nuevo -- mismo patron ya probado por `subscriptions` en el item 06.

CHECKPOINT -- Detente aca. No inicies la Fase 3 sin aprobacion.
**Commit sugerido**: `fix(api): wrap payment creation and event publish in a transaction`

---

## Fase 3 -- `GET /v1/admin/outbox` + entrega asincrona en los e2e existentes + e2e de durabilidad

**Objetivo**: exponer el estado del outbox para la demo de arquitectura, arreglar el hallazgo 5 (entrega ya no sincrona) sin debilitar ningun assert, y cubrir con e2e los tres criterios de aceptacion del spec sobre durabilidad/reintento/idempotencia.
**Area**: api + shared
**Archivos**:

- `packages/shared/src/api-paths.ts:32-36` (agregar `outbox: '/v1/admin/outbox'` dentro de `admin`)
- `packages/shared/src/schemas/admin.ts` (nuevo -- `outboxEventSchema`: `id, type, status ('PENDING'|'PROCESSED'|'FAILED'), attempts, lastError?, createdAt, processedAt?`)
- `packages/shared/src/types/admin.ts` (nuevo -- `export type OutboxEventSummary = z.infer<typeof outboxEventSchema>`)
- `packages/shared/src/index.ts` (agregar `export * from './schemas/admin'` y `export * from './types/admin'`)
- `apps/api/src/infra/events/controllers/outbox-admin.controller.ts` (nuevo -- `@Roles(Role.ADMIN)`, `@Controller('admin/outbox')`, `GET /` -> `OutboxRepository.listRecent(50)` mapeado a `OutboxEventSummary[]` con el status derivado segun decision D1)
- `apps/api/src/infra/events/controllers/dto/outbox-event.dto.ts` (nuevo -- `createZodDto(outboxEventSchema)`, patron `dashboard-summary.dto.ts`)
- `apps/api/src/infra/events/events.module.ts` (agregar `controllers: [OutboxAdminController]`)
- `apps/api/test/utils/wait-for.ts` (nuevo -- `waitFor(fn, { timeoutMs = 2000, intervalMs = 25 })`: reintenta `fn` hasta que devuelva un valor truthy o expire, lanzando el ultimo error/valor si expira)
- `apps/api/test/subscriptions-flow.e2e-spec.ts:1-12,139-166,215-244` (agregar `process.env.OUTBOX_RELAY_INTERVAL_MS = '20'` junto al `PAYMENT_SIMULATION_DELAY_MS` existente, primera linea del archivo; reemplazar las aserciones inmediatas de `journeyPoints`/`notifications.total` y de la notificacion al follower por `waitFor(...)`)
- `apps/api/test/outbox.e2e-spec.ts` (nuevo -- los 2 criterios de aceptacion del spec sobre outbox)

**Shared**: Si, aditivo -- `admin.outbox` es una clave nueva en `api-paths.ts`, sin consumidores todavia (grep confirma que `admin.metrics`, agregada antes, tampoco tiene consumidores hoy: el admin la usa recien en el item 13).
**Prisma**: No (usa la migracion de la fase 1).
**Eventos**: No.

**Acciones**:

1. `outboxEventSchema`/`OutboxEventSummary` en shared, exportados.
2. `OutboxAdminController` + DTO, registrados en `EventsModule`.
3. `waitFor` helper en `test/utils/`.
4. Ajustar `subscriptions-flow.e2e-spec.ts` segun hallazgo 5: intervalo del relay bajo + `waitFor` en las 2 aserciones afectadas. El resto del archivo no cambia.
5. `outbox.e2e-spec.ts` nuevo, con:
   - **Durabilidad**: `POST /v1/subscriptions` con tarjeta aprobada -> existe una fila en `OutboxEvent` para `subscription.activated` casi inmediatamente (sin esperar) -> `waitFor` hasta 2 s a que `JourneyPoint` y `Notification` existan y `processedAt` este seteado (criterio de aceptacion 1 del spec, "en < 2 s").
   - **Reintento sin perder el 201**: `app.get(OutboxFaultInjector).failNextDeliveryOnce(EventName.SUBSCRIPTION_ACTIVATED)` antes del `POST`; el `POST` sigue respondiendo `201` (la entrega es asincrona, no bloquea la respuesta); `waitFor` hasta que la fila tenga `attempts >= 1` y `lastError` no nulo; `waitFor` de nuevo hasta que el proximo tick la entregue igual (`processedAt` seteado) -- cubre el criterio de aceptacion 2 ("el endpoint original respondio 201 igual").
   - **`GET /v1/admin/outbox` como USER -> 403**.
6. Limpiar en `afterAll` los usuarios/proyectos creados por el archivo nuevo, igual patron que `subscriptions-flow.e2e-spec.ts` (regla del plan 06, hallazgo 13: no romper los conteos exactos de `seed.e2e-spec.ts`).

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit,e2e` (primera vez que `e2e` vuelve a correr desde la fase 0 -- tiene que quedar verde, cerrando el rojo esperado de las fases 1-2)
- Caso negativo: `GET /v1/admin/outbox` sin rol ADMIN -> 403 (incluido en `outbox.e2e-spec.ts`, punto 5 arriba).

**Riesgos**:

- `waitFor` con timeout demasiado corto puede ser flaky en CI si la maquina esta cargada -- 2 s de margen sobre un intervalo de relay de 20 ms en test da bastante colchon (100 ticks), pero si el checkpoint muestra flakiness real, subir el timeout antes que bajar la exigencia del assert.

CHECKPOINT -- Detente aca. No inicies la Fase 4 sin aprobacion.
**Commit sugerido**: `feat(api): admin outbox endpoint and durability e2e coverage`

---

## Fase 4 -- `GET /v1/admin/metrics` con cache en memoria de 30 s

**Objetivo**: exponer `users`, `activeSubscriptionsByPlan`, `mrrSimulated`, `projectsByStatus`, `updatesLast30Days`, `avgProgressByZone` para el admin, cacheados 30 s en memoria.
**Area**: api + shared
**Archivos**:

- `packages/shared/src/schemas/admin.ts` (agregar `adminMetricsSchema` al mismo archivo de la fase 3)
- `packages/shared/src/types/admin.ts` (agregar `export type AdminMetrics = z.infer<typeof adminMetricsSchema>`)
- `apps/api/src/modules/impact/infrastructure/admin-metrics.repository.ts` (nuevo -- separado de `ImpactRepository` a proposito, ver hallazgo/nota de reuso: `ImpactRepository` es "dashboard de un usuario", este es "agregados de todos". Metodos: `countUsers()`, `countActiveSubscriptionsByPlan()` (`prisma.subscription.groupBy({ by: ['planId'], where: { status: 'ACTIVE' }, _count: true })`, rellenando los 3 `PlanId` con 0 los que no aparecen), `listActiveSubscriptionsWithPlan()` (para `mrrSimulated`, decision D5), `countProjectsByStatus()` (`groupBy` sobre `ProjectStatus`, mismo relleno a 0), `countUpdatesSince(date)`, `avgProgressByZone()` (decision D4, via `prisma.zone.findMany` con `projects: { select: { progress: true } }`))
- `apps/api/src/modules/impact/application/admin-metrics.service.ts` (nuevo -- cache en memoria: campo privado `{ data: AdminMetrics; expiresAt: number } | null`; `getMetrics()` devuelve el cache si `Date.now() < expiresAt`, si no recalcula con `Promise.all` sobre los metodos del repositorio y guarda por `ADMIN_METRICS_CACHE_MS` (constante `30_000`))
- `apps/api/src/modules/impact/application/admin-metrics.service.spec.ts` (nuevo -- unit: dos llamadas seguidas usan el cache, una tercera despues de avanzar el reloj falso recalcula)
- `apps/api/src/modules/impact/controllers/admin-metrics.controller.ts` (nuevo -- `@Roles(Role.ADMIN)`, `@Controller('admin/metrics')`, `GET /`)
- `apps/api/src/modules/impact/controllers/dto/admin-metrics.dto.ts` (nuevo -- `createZodDto(adminMetricsSchema)`)
- `apps/api/src/modules/impact/impact.module.ts` (registrar `AdminMetricsRepository`, `AdminMetricsService`, `AdminMetricsController`)
- `apps/api/test/admin-metrics.e2e-spec.ts` (nuevo)

**Shared**: Si -- `adminMetricsSchema`/`AdminMetrics` nuevos en el mismo archivo que la fase 3; `api-paths.ts` no cambia aca (`admin.metrics` ya existia).
**Prisma**: No (solo lecturas nuevas sobre tablas existentes).
**Eventos**: No.

**Acciones**:

1. `AdminMetricsRepository` con los 5 metodos, cada uno documentando por que rellena a 0 los grupos ausentes (para que "conteos coherentes" del criterio de aceptacion incluya, p. ej., un plan sin suscripciones activas).
2. `mrrSimulated`: sumar `monthlyPriceFor(plan, billing) * 100` (centavos) por cada `Subscription{status: ACTIVE}`.
3. `AdminMetricsService` con el cache de 30 s.
4. Controller + DTO + registro en `impact.module.ts`.
5. `admin-metrics.e2e-spec.ts`: `GET /v1/admin/metrics` como ADMIN contra el seed (`packages/shared/src/seed-data.ts` -- verificar contra los conteos reales del seed, no inventar numeros); como USER -> 403; dos requests seguidas dentro de 30 s devuelven el mismo `users` aunque se cree un usuario nuevo en el medio (prueba el cache sin depender de temporizadores reales -- crear el usuario, pedir metrics dos veces rapido, confirmar que el segundo numero es igual al primero y no al conteo real post-creacion).

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope shared --only typecheck,unit`
- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit,e2e --filter impact`
- Caso negativo: `GET /v1/admin/metrics` como USER -> 403.

**Riesgos**:

- El test de cache que crea un usuario y espera que el segundo `GET` no lo cuente es sensible al orden si otro test de la misma suite corre en paralelo con `maxWorkers: 1` -- no hay paralelismo real dentro de la suite e2e de `api`, asi que no hay riesgo de carrera entre archivos, pero el propio `describe` debe evitar reordenar sus `it` con `.only`/`test.concurrent`.

CHECKPOINT -- Detente aca. No inicies la Fase 5 sin aprobacion.
**Commit sugerido**: `feat(api): admin metrics endpoint`

---

## Fase 5 -- Observabilidad, ADR-003, bateria completa y AI log

**Objetivo**: logging estructurado con `nestjs-pino` y request-id (decision D7), documentar la decision de outbox-sin-cola-externa como ADR (decision D6), y cerrar el item con la bateria completa verde.
**Area**: api + docs
**Archivos**:

- `apps/api/package.json` (agregar `nestjs-pino`, `pino-http`)
- `apps/api/src/infra/logging/logging.module.ts` (nuevo -- `LoggerModule.forRootAsync` con `genReqId`, `redact` de headers sensibles (`authorization`), nivel `debug` en development, `info` en production, `silent` cuando `NODE_ENV === 'test'`)
- `apps/api/src/app.module.ts` (importar `LoggingModule`)
- `apps/api/src/main.ts:1-26` (`app.useLogger(app.get(Logger))` de `nestjs-pino`, reemplaza el `console.log` final por el logger inyectado)
- `docs/adr/003-outbox-and-queue-transport.md` (nuevo -- contexto: outbox sin cola externa por ahora; decision: `EventEmitter2` + relay propio, documentar D1-D5 de este plan resumidas; alternativas: BullMQ/Upstash como siguiente paso, igual que anticipa `backend-nest.md:53`)
- `docs/ai-workflow.md` (entrada via `/ai-log`, no se escribe a mano en esta fase -- se invoca el comando aparte)

**Shared**: No
**Prisma**: No
**Eventos**: No (solo logging alrededor de `EventBus.publish` y `OutboxRelay`, ya con los logs minimos desde la fase 1 -- aca se estructuran con pino en vez de con el `Logger` de consola).

**Acciones**:

1. Agregar dependencias y `LoggingModule`.
2. `app.useLogger(...)` en `main.ts` unicamente (no en `create-test-app.ts`, decision D7).
3. Confirmar que los logs de `OutboxRelay`/`EventBus` de la fase 1 (`type`, `id`, `ms`, sin payload) siguen sin exponer PII ni datos de tarjeta -- son solo ids y timings.
4. Escribir `docs/adr/003-outbox-and-queue-transport.md` siguiendo el formato de `docs/adr/002-admin-ui-primitives.md` (Contexto / Decision / Alternativas consideradas / Consecuencias).
5. Correr la bateria completa: `bash scripts/dev/quality-check.sh --scope all`.
6. Recordar (no ejecutar aca) `/ai-log` para dejar la entrada de esta sesion en `docs/ai-workflow.md`.

**Verificacion**:

- `bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit,e2e`
- `bash scripts/dev/quality-check.sh --scope all` (cierre del plan)
- Pendiente manual: confirmar en la salida de `pnpm dev:api` que los logs salen en JSON con un `req.id` distinto por request (no automatizable con `quality-check.sh`, se anota como verificado a mano).

**Riesgos**: agregar `nestjs-pino` es la unica dependencia nueva del plan -- si `pnpm install` en el worktree tarda o falla por red, es el punto de mayor friccion operativa de todo el plan; no bloquea nada mas si se decide diferir esta fase sola.

CHECKPOINT -- Fin del plan.
**Commit sugerido**: `feat(api): structured logging for event publish and delivery` (+ commit separado `docs: adr-003 outbox and future queue transport`)
