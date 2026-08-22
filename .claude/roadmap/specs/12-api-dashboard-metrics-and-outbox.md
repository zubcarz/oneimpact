# Spec 12 -- api-dashboard-metrics-and-outbox

**Track**: api · **Depende de**: 06 · **Ola**: 5 (paralelo con 10); si no entra, primer item de Fase 2
**Rama**: `feat/api-dashboard-metrics-and-outbox` · **Modo**: `/run-plan-worktree`

## Objetivo

Cerrar la arquitectura a eventos con el **patron Outbox** (eventos durables,
entregados por un relay, idempotentes) y exponer las **metricas del admin**.

## Referencia del vault
`backend-nest.md` (Eventos de dominio, Outbox). Regla `30-api-event-driven.md`.

## Alcance

### Outbox
- `EventBus.publish(event, tx?)` pasa a insertar en `OutboxEvent` (modelo ya existe desde 01) **dentro de la transaccion** que recibe; si no recibe `tx`, abre una.
- `OutboxRelay` (`@Interval(1000)`): toma lotes `processedAt IS NULL` ordenados por `createdAt`, `emitAsync`, marca `processedAt`; en error, `attempts++` y `lastError`; tras 5 intentos lo deja en `FAILED` (campo nuevo; migracion `outbox_attempts`).
- Los use cases de 06 que crean estado + evento pasan a usar `prisma.$transaction` y `publish(event, tx)`. **Ningun modulo cambia su interfaz.**
- `GET /v1/admin/outbox` (ADMIN): ultimos 50 con estado -- util para la demo de arquitectura.
- Tests: evento persistido aunque el listener falle; relay no reprocesa; listener idempotente ante re-entrega.

### Metricas (`impact`)
- `GET /v1/admin/metrics` (ADMIN): `users`, `activeSubscriptions` por plan, `mrrSimulated`, `projectsByStatus`, `updatesLast30Days`, `avgProgressByZone`. Query agregadas Prisma (`groupBy`), cache en memoria 30 s.
- Listener `project.update_published` -> recalcula `avgProgressByZone` (o se calcula on-read; decidir en el plan, default on-read).

### Observabilidad
- `nestjs-pino` con request-id; log de cada evento publicado/entregado (`type`, `id`, `ms`), sin payload completo.

## Fuera de alcance
Cola externa (BullMQ/Upstash) -- documentar como siguiente paso en ADR.

## Criterios de aceptacion
- e2e: `POST /subscriptions` -> fila en `OutboxEvent` -> en < 2 s `JourneyPoint` y notificacion creados -> `processedAt` seteado.
- Simular excepcion en un listener (flag de test): el evento queda con `attempts` y se reintenta; el endpoint original respondio 201 igual.
- `GET /admin/metrics` con seed devuelve conteos coherentes; como USER -> 403.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit
bash scripts/dev/quality-check.sh --scope api --only e2e
```

## Commits sugeridos
`feat(api): transactional outbox and relay` · `feat(api): admin metrics endpoint` · `docs: adr-006 outbox and future queue transport`
