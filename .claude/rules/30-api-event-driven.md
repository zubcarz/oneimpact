# Convenciones de `apps/api` (NestJS, monolito modular orientado a eventos)

Arquitectura de referencia: vault
`01-Tecnologia-Arquitectura/backend-nest.md` y `arquitectura-sistema.md`
(contrato REST, modelo Prisma, tabla de eventos).

## Modulos y limites

```
src/modules/
  auth          register/login/refresh, JWT            emite user.registered
  users         perfil, roles                           escucha subscription.activated
  catalog       plans, zones (solo lectura publica)
  projects      projects, updates, follows              emite project.created, project.update_published, project.followed
  subscriptions crea/cancela                            emite subscription.activated|canceled; escucha payment.*
  payments      simulador                               emite payment.succeeded|failed
  impact        JourneyPoints, dashboard/me, admin/metrics   escucha subscription.*, project.update_published
  notifications crea notificaciones in-app              escucha casi todo
  health
```

Cada modulo: `<name>.module.ts`, `controllers/`, `application/` (use cases),
`domain/` (eventos, tipos), `infrastructure/` (repos Prisma).

**Regla de oro: un modulo no importa servicios de otro modulo.** Excepcion unica:
`catalog` (lectura) puede inyectarse donde haga falta. Si `subscriptions`
necesita algo de `users`, se comunica por evento. Un import cruzado es un error
de diseno del plan: se reporta, no se hace.

## Eventos

- Nombres `dominio.accion` en pasado: `subscription.activated`,
  `project.update_published`. Constantes en `src/infra/events/event-names.ts`.
- Payload = objeto plano serializable con ids, no entidades Prisma.
- Se publican via `EventBus.publish(event, tx?)` (`src/infra/events`). Con
  **outbox**: el evento se inserta en `OutboxEvent` dentro de la misma
  transaccion que el cambio de estado; `OutboxRelay` (`@Interval`) lo entrega a
  `@OnEvent`. Mientras el outbox no exista, `publish` hace `emitAsync` directo,
  con la **misma firma**: los modulos no cambian.
- **Listeners idempotentes**: `upsert` por clave natural (`userId+month` en
  JourneyPoint, `userId+type+refId` en Notification). "El evento llega dos
  veces" es parte de la tarea, no un extra.
- Un listener nunca lanza para abortar el flujo del emisor: loguea y registra el
  fallo. El emisor ya commiteo.

## Pago simulado (`payments`)

- Input validado con `simulatedCardSchema` de `packages/shared`. **Nunca** un
  campo `number`/`pan`. Si un DTO lo incluye, es un hallazgo bloqueante.
- Reglas: `last4 === '0000'` -> `FAILED`; expiracion pasada -> `FAILED`; resto
  `SUCCEEDED` con latencia artificial ~800 ms. Siempre `simulated = true` en
  `Payment`.

## Auth y roles

- JWT propio: access 15 min, refresh 30 d rotado y guardado hasheado. argon2.
- `JwtAuthGuard` global + `@Public()` para abrir; `RolesGuard` + `@Roles('ADMIN')`.
- `role` nunca editable por el propio usuario. Solo `PATCH /admin/users/:id/role`.
- Throttling en `/auth/*` (10/min).
- Casos negativos obligatorios en tests: rol sin permiso -> 403; sin token -> 401.

## Validacion y errores

- Input con zod (`nestjs-zod`) usando schemas de `packages/shared`. No
  `class-validator`.
- Errores de dominio como excepciones tipadas (`DomainError` con `code`), mapeadas
  a HTTP por un filter global. Nunca `throw new Error('...')` desde un use case.
- Respuestas JSON planas; listas con `{ items, total }`.

## Prisma

- Schema en `prisma/schema.prisma`; enums espejo de `packages/shared`.
- Migraciones con `prisma migrate dev --name <slug>`, nunca editadas a mano
  despues de aplicadas. Una migracion por fase que toque el schema.
- Seed idempotente (`upsert`). El seed es el dataset de la demo, de los e2e y
  de MSW: **los tres consumen el mismo**.
- `DATABASE_URL` (pooler en Supabase) + `DIRECT_URL` (migraciones).

## Observabilidad y seguridad

Helmet, CORS por lista, pino JSON, `/health` con estado de DB. Nada de PII ni
tokens en logs.

## Tests

- Unit (Jest): use cases con repos mockeados. Obligatorios: `PaymentsService`,
  `SubscriptionsService.activate`, listeners de `impact`, guards.
- e2e (supertest + Postgres local): flujos completos y casos negativos.
- `pnpm --filter @oneimpact/api test` y `test:e2e` (este ultimo necesita
  `pnpm db:up`).
