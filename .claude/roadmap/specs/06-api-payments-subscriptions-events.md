# Spec 06 -- api-payments-subscriptions-events

**Track**: api · **Depende de**: 05 · **Ola**: 3 (paralelo con 08 y 11)
**Rama**: `feat/api-payments-subscriptions-events` · **Modo**: `/run-plan-worktree`

## Objetivo

El corazon del negocio y la demostracion de la **arquitectura a eventos**:
pago simulado -> suscripcion activa -> efectos en `impact` (punto de
travesia) y `notifications` (bienvenida), todo por eventos. Tambien escritura
de proyectos y follows (los usa 11 desde el admin y 08/10 desde mobile).

## Referencia del vault
`backend-nest.md` (Eventos, Pago simulado), `arquitectura-sistema.md` (Flujo clave). Regla `30-api-event-driven.md`.

## Alcance

### Modulo `payments`
- `PaymentsService.simulate(card, amount)`: `last4 === '0000'` -> FAILED; `expYear/expMonth` pasados -> FAILED; resto SUCCEEDED con latencia 800 ms. Crea `Payment{simulated:true, cardBrand, cardLast4}`. Emite `payment.succeeded | payment.failed`.
- **Sin controller propio**: lo invoca `subscriptions`. Nunca recibe PAN (el schema de shared ya lo impide).

### Modulo `subscriptions`
- `POST /v1/subscriptions` (`createSubscriptionSchema`) -> calcula monto (`monthlyPriceFor` / `annualTotal`), llama a `payments.simulate`; si SUCCEEDED crea `Subscription{ACTIVE}` y emite `subscription.activated`; si FAILED responde 402 `PAYMENT_DECLINED` con `{ reason }`. Si ya tiene una activa -> 409 `SUBSCRIPTION_EXISTS`.
- `GET /v1/subscriptions/me` -> activa o 404. `DELETE /v1/subscriptions/me` -> CANCELED + `subscription.canceled`.
- Listeners `payment.*` solo para log/auditoria (el flujo principal es sincrono dentro del use case; el evento queda para `notifications`).

### Modulo `projects` (escritura)
- `POST /v1/projects` (ADMIN, `createProjectSchema`) -> `project.created`.
- `PATCH /v1/projects/:id` (ADMIN, `updateProjectSchema`).
- `POST /v1/projects/:id/updates` (ADMIN, `publishUpdateSchema`) -> crea update, recalcula `project.progress`, emite `project.update_published`.
- `POST/DELETE /v1/projects/:id/follow` (USER) -> `project.followed` / unfollow. Idempotente (upsert/deleteMany).
- `POST /v1/uploads/sign` (ADMIN) -> signed URL de Supabase Storage (si no hay credenciales en env, devuelve una URL local fake para dev; documentar).

### Modulo `impact` (minimo para 10)
- Listener `subscription.activated` -> `upsert JourneyPoint{userId, month}` (idempotente).
- Listener `subscription.canceled` -> nada destructivo (los puntos son permanentes).
- `GET /v1/dashboard/me` -> `DashboardSummary` (plan, billing, activeSince, months, journeyPoints, followedProjects con ultimo update, unreadNotifications).

### Modulo `notifications`
- Listeners: `user.registered` (bienvenida), `subscription.activated` (plan activo), `project.update_published` (a followers). Idempotentes por `(userId,type,refId)`.
- `GET /v1/notifications/me`, `PATCH /v1/notifications/:id/read`.

## Fuera de alcance
Outbox y relay (12). Metricas admin (12).

## Invariantes
- **Evento duplicado no duplica efecto** (test explicito por listener).
- Listener nunca hace fallar al emisor.
- `Payment.simulated` siempre true.

## Criterios de aceptacion (e2e)
- Flujo completo: register -> `POST /subscriptions` (4242) -> 201, `GET /dashboard/me` muestra plan y 1 journey point, `GET /notifications/me` 2 items.
- Tarjeta `0000` -> 402, sin suscripcion creada, sin journey point.
- Segunda suscripcion -> 409. Cancelar -> CANCELED; journey point sigue.
- Admin publica update -> follower recibe notificacion; emitir el evento dos veces (test unit) -> 1 notificacion.
- USER intenta `POST /projects` -> 403.

## Verificacion
```
bash scripts/dev/quality-check.sh --scope api --only typecheck,lint,unit
bash scripts/dev/quality-check.sh --scope api --only e2e
```

## Commits sugeridos
`feat(api): simulated payments and subscriptions` · `feat(api): project writes and follows` · `feat(api): impact and notifications listeners`
