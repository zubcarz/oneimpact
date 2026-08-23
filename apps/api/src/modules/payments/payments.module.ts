import { Module } from '@nestjs/common';
import { PaymentsService } from './application/payments.service';
import { PaymentsRepository } from './infrastructure/payments.repository';

/**
 * SANCTIONED EXCEPTION to the golden rule "un modulo no importa servicios de
 * otro modulo" (`30-api-event-driven.md`). This module EXPORTS
 * `PaymentsService` so `SubscriptionsModule` can inject it directly -- decision
 * D2a of `.claude/plans/20260822-api-payments-subscriptions-events.plan.md`.
 * `payments` becomes the SECOND sanctioned exception, alongside `catalog`
 * (read-only lookups).
 *
 * Why this is not a violation and not an event:
 *
 * - The flow the vault describes is SYNCHRONOUS
 *   (`arquitectura-sistema.md`, "Flujo clave", step 3): `POST
 *   /v1/subscriptions` must know the payment OUTCOME (`SUCCEEDED` vs
 *   `FAILED`, plus a `reason` on failure) before it can decide whether to
 *   create the `Subscription` row at all, or instead answer the client with
 *   402 `PAYMENT_DECLINED`. A domain event is fire-and-forget -- nothing
 *   awaits a return value from `EventBus.publish` -- so there is no event
 *   shaped mechanism that lets `subscriptions` block on, and branch its own
 *   HTTP response on, what `payments` decided. A direct call is the only way
 *   to keep that decision inside the same request/response cycle.
 * - The 8-row event table in the vault (`backend-nest.md`) has no
 *   `payment.requested` event that `subscriptions` could publish and
 *   `payments` could react to, which is the usual way to invert this kind of
 *   dependency. Inventing one now would mean stepping outside a contract this
 *   whole plan (and its Prisma migration) is deliberately scoped to, for a
 *   flow the vault already documents as synchronous.
 * - `payments` has no controller of its own -- it is reachable ONLY through
 *   this exported service, invoked programmatically by `subscriptions`. That
 *   is the same shape `catalog` already uses for its own sanctioned
 *   exception (a narrow, read-oriented surface exported on purpose), not an
 *   open door for arbitrary modules to reach into each other.
 * - `payment.succeeded` / `payment.failed` are still published through
 *   `EventBus` regardless of the outcome, for every OTHER listener that does
 *   not need the synchronous return value (e.g. `subscriptions`' own
 *   audit-only listener on those two events, added alongside this module).
 */
@Module({
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}
