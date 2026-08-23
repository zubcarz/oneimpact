import { Injectable } from '@nestjs/common';
import type { CreateSubscriptionInput, Plan, Subscription } from '@oneimpact/shared';
import { Billing, monthlyPriceFor } from '@oneimpact/shared';
import { PaymentStatus } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { CatalogService } from '../../catalog/application/catalog.service';
import type { PaymentFailureReason } from '../../payments/application/payments.service';
import { PaymentsService } from '../../payments/application/payments.service';
import type {
  SubscriptionActivatedEvent,
  SubscriptionCanceledEvent,
} from '../domain/subscriptions.events';
import { toSubscription } from '../infrastructure/subscriptions.mapper';
import { SubscriptionsRepository } from '../infrastructure/subscriptions.repository';

/**
 * Human-readable message per `PaymentFailureReason`. Copy in Spanish, codes
 * in English -- see `00-base-rules.md`.
 */
const DECLINE_MESSAGES: Record<PaymentFailureReason, string> = {
  CARD_DECLINED: 'El pago fue rechazado por el emisor de la tarjeta.',
  CARD_EXPIRED: 'La tarjeta ingresada esta vencida.',
};

/**
 * Orchestrates the synchronous "simulate payment -> activate subscription"
 * flow (`arquitectura-sistema.md`, "Flujo clave", step 3).
 *
 * Injects `PaymentsService` and `CatalogService` directly: both are
 * SANCTIONED exceptions to the golden rule "un modulo no importa servicios de
 * otro modulo" (`30-api-event-driven.md`) -- `catalog` for read-only lookups,
 * `payments` per decision D2a of
 * `.claude/plans/20260822-api-payments-subscriptions-events.plan.md` (full
 * justification in `payments.module.ts`'s class doc). No other cross-module
 * import is allowed from this service.
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly repository: SubscriptionsRepository,
    private readonly payments: PaymentsService,
    private readonly catalog: CatalogService,
    private readonly eventBus: EventBus,
  ) {}

  async create(userId: string, input: CreateSubscriptionInput): Promise<Subscription> {
    const active = await this.repository.findActiveByUserId(userId);
    if (active) {
      throw new DomainError('SUBSCRIPTION_EXISTS', 409, 'Ya tenes una suscripcion activa.');
    }

    const plan = await this.findPlan(input.planId);
    const amount = this.amountInCents(plan, input.billing);

    const result = await this.payments.simulate({ userId, amount, card: input.card });

    if (result.status === PaymentStatus.FAILED) {
      // No subscription is created on this path: the payment already failed
      // and persisted its own `Payment{status:FAILED}` row inside
      // `PaymentsService.simulate` -- nothing left to roll back here.
      throw this.declineError(result.reason);
    }

    const subscription = await this.repository.runTransaction(async (tx) => {
      const row = await this.repository.createActivated(tx, {
        userId,
        planId: input.planId,
        billing: input.billing,
        paymentId: result.paymentId,
      });

      const event: SubscriptionActivatedEvent = {
        type: EventName.SUBSCRIPTION_ACTIVATED,
        occurredAt: new Date(),
        payload: {
          userId,
          subscriptionId: row.id,
          planId: input.planId,
          billing: input.billing,
        },
      };
      await this.eventBus.publish(event, tx);

      return row;
    });

    return toSubscription(subscription);
  }

  async getMine(userId: string): Promise<Subscription> {
    const active = await this.repository.findActiveByUserId(userId);
    if (!active) {
      throw DomainError.notFound('SUBSCRIPTION_NOT_FOUND', 'No tenes una suscripcion activa.');
    }
    return toSubscription(active);
  }

  async cancelMine(userId: string): Promise<Subscription> {
    const active = await this.repository.findActiveByUserId(userId);
    if (!active) {
      throw DomainError.notFound('SUBSCRIPTION_NOT_FOUND', 'No tenes una suscripcion activa.');
    }

    const canceled = await this.repository.runTransaction(async (tx) => {
      const row = await this.repository.cancel(tx, active.id);

      const event: SubscriptionCanceledEvent = {
        type: EventName.SUBSCRIPTION_CANCELED,
        occurredAt: new Date(),
        payload: { userId, subscriptionId: row.id },
      };
      await this.eventBus.publish(event, tx);

      return row;
    });

    return toSubscription(canceled);
  }

  /**
   * `CatalogService` has no `getPlanById` -- `listPlans` always returns the
   * same small, fixed set of rows (`packages/shared/src/plans.ts`), so
   * filtering in memory here avoids adding a new method to a module this
   * task is not scoped to touch. See task report for this deviation.
   */
  private async findPlan(planId: CreateSubscriptionInput['planId']): Promise<Plan> {
    const { items } = await this.catalog.listPlans();
    const plan = items.find((item) => item.id === planId);
    if (!plan) {
      throw DomainError.notFound('PLAN_NOT_FOUND', `El plan "${planId}" no existe.`);
    }
    return plan;
  }

  /**
   * `Payment.amount` is in cents (`schema.prisma` comment); `PLANS` prices
   * are whole dollars (`packages/shared/src/plans.ts`). Monthly billing
   * charges the recurring monthly price; annual billing charges the full
   * `annualTotal` up front, not `annualMonthlyPrice * 12`.
   */
  private amountInCents(plan: Plan, billing: Billing): number {
    return billing === Billing.ANNUAL
      ? plan.annualTotal * 100
      : monthlyPriceFor(plan, billing) * 100;
  }

  /**
   * `DomainError` carries `PaymentFailureReason` in its structured `details`
   * (`{ reason }`), per the spec's "402 `PAYMENT_DECLINED` con `{ reason }`".
   * `DomainErrorFilter` surfaces `details` as-is, so clients read
   * `details.reason` instead of parsing the Spanish `message`.
   */
  private declineError(reason: PaymentFailureReason | undefined): DomainError {
    const message = reason ? DECLINE_MESSAGES[reason] : 'El pago fue rechazado.';
    return new DomainError('PAYMENT_DECLINED', 402, message, { reason: reason ?? 'UNKNOWN' });
  }
}
