# ADR-003: Outbox transaccional con relay propio, sin cola externa

Fecha: 2026-08-24 · Estado: aceptada

## Contexto

El vault (`01-Tecnologia-Arquitectura/backend-nest.md`) describe el patron
Outbox para los 8 eventos de dominio del sistema (`user.registered`,
`subscription.activated`, `subscription.canceled`, `payment.succeeded`,
`payment.failed`, `project.created`, `project.update_published`,
`project.followed`) y deja abierta la posibilidad de que, en una fase futura,
el transporte de entrega evolucione de un emisor en memoria a una cola externa
(BullMQ sobre Redis/Upstash). Para esta prueba tecnica la escala es la de una
demo: un puñado de usuarios, proyectos y suscripciones, un unico proceso de
API. `EventBus.publish(event, tx?)` ya tenia, desde el item 06
(`.claude/plans/20260822-api-payments-subscriptions-events.plan.md`), la firma
definitiva pensada para admitir outbox sin que ningun modulo de dominio
tuviera que cambiar su codigo de publicacion.

Antes de este plan, `publish` hacia `emitAsync` directo y sincrono: si el
proceso moria entre escribir el estado (por ejemplo, un `Payment`) y publicar
el evento asociado, el evento se perdia sin dejar rastro. El patron Outbox
existe exactamente para cerrar esa ventana.

## Decision

`EventBus.publish(event, tx?)` inserta una fila en `OutboxEvent`
(`type`, `payload`, `createdAt`, `processedAt`, `attempts`, `lastError`)
dentro de la misma transaccion de Prisma que el cambio de estado del caller,
cuando se pasa `tx`. `OutboxRelay` es un `@Injectable()` que implementa
`OnModuleInit`/`OnModuleDestroy` con un `setInterval`/`clearInterval` propio
de Node -- **no** `@Interval` de `@nestjs/schedule` (ver Alternativas). Cada
tick toma un lote de filas pendientes (`processedAt IS NULL AND attempts <
OUTBOX_MAX_ATTEMPTS`, default 5), las entrega via `EventEmitter2.emitAsync`
a los `@OnEvent` existentes, y marca `processedAt` en exito o incrementa
`attempts`/`lastError` en fallo. El estado (`PENDING`/`PROCESSED`/`FAILED`) se
deriva en lectura a partir de `processedAt`/`attempts`, sin una columna
`status` adicional que pudiera desincronizarse. `GET /v1/admin/outbox` expone
las ultimas 50 filas para la demo de arquitectura, mostrando el estado real
del bus de eventos sin exponer el `payload` completo en los logs de entrega
(`type`, `id` y `ms` unicamente, ver `OutboxRelay.deliver`).

## Alternativas consideradas

- **`@nestjs/schedule` con `@Interval(1000)`**, tal como sugiere el vault
  literalmente. Se descarto porque ese decorador no limpia sus timers al
  cerrar la app salvo que se llame `enableShutdownHooks()`, y ningun test
  helper de este repo lo activa (`test/utils/create-test-app.ts`). Activarlo
  solo para esto habria agregado una dependencia y una llamada de arranque
  mas, sin ningun beneficio observable sobre `OnModuleInit`/`OnModuleDestroy`
  con `setInterval`/`clearInterval` nativos de Nest, que ya se ejecutan
  automaticamente con `app.close()`.
- **Persistir un campo `status` en `OutboxEvent`** ademas de
  `processedAt`/`attempts`. Se descarto porque duplicaria una fuente de
  verdad que ya se puede derivar de forma barata en cada lectura (`WHERE` del
  relay y DTO del endpoint admin comparten la misma regla).
- **BullMQ/Upstash desde el arranque de este item.** Es la evolucion que el
  propio vault anticipa, pero para el volumen de esta prueba tecnica
  (una sola instancia de API, decenas de eventos) agrega infraestructura y
  complejidad operativa sin una necesidad real de escala que la justifique
  ahora.

## Consecuencias

- El relay es en memoria y por proceso: si la API llegara a correr en mas de
  una instancia, cada una tendria su propio `OutboxRelay` compitiendo por las
  mismas filas de `OutboxEvent` sin ningun lock distribuido, con riesgo de
  entregas duplicadas (mitigado en parte por los listeners idempotentes, pero
  no eliminado). Para una sola instancia -- el caso de esta prueba -- no es un
  problema.
- La entrega deja de ser sincrona con la respuesta HTTP: un cliente que hace
  `POST /v1/subscriptions` y de inmediato consulta un efecto derivado
  (`GET /v1/dashboard/me`) puede no verlo todavia en ese mismo instante. Los
  e2e que dependian de esa sincronia se ajustaron a un helper de polling
  (`waitFor`) en vez de debilitar sus asserts.
- **Punto de revision:** si el proyecto escala a mas de una instancia de API,
  ahi si conviene migrar el transporte a una cola externa con locks
  distribuidos (BullMQ + Redis/Upstash). El contrato
  `EventBus.publish(event, tx?)` ya esta preparado para ese cambio sin tocar
  ningun modulo de dominio -- exactamente como preveia el vault desde el
  item 06.
