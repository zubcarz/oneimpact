import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SimulatedCard } from '@oneimpact/shared';
import { PaymentStatus } from '@prisma/client';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { PaymentsRepository } from '../infrastructure/payments.repository';

const CURRENCY = 'USD';
const DEFAULT_SIMULATION_DELAY_MS = 800;

export interface SimulatePaymentInput {
  userId: string;
  /** Amount in cents (see `Payment.amount` comment in `schema.prisma`). */
  amount: number;
  card: SimulatedCard;
}

export type PaymentFailureReason = 'CARD_DECLINED' | 'CARD_EXPIRED';

/**
 * Shaped so `subscriptions` (the sanctioned caller, see `payments.module.ts`)
 * can decide the HTTP outcome of `POST /v1/subscriptions` without touching
 * Prisma or the event bus itself.
 */
export interface SimulatePaymentResult {
  status: PaymentStatus;
  paymentId: string;
  reason?: PaymentFailureReason;
}

/**
 * Simulated card processor. Rules from the vault
 * (`backend-nest.md`, "Pago simulado"):
 *
 * 1. `card.last4 === '0000'` -> declined.
 * 2. Expired card -> declined. "Expired" means the END of the expiration
 *    month has passed, not its start -- a card expiring in the current
 *    calendar month is still valid (see `isExpired` below).
 * 3. Anything else -> approved, after an artificial processing latency.
 *
 * A `Payment` row is ALWAYS persisted, `simulated: true` in every case,
 * including declines: the migration that made `subscriptionId` optional
 * exists precisely so a rejected attempt (which has no subscription yet)
 * can still be recorded and attributed to `userId` for auditing/metrics.
 *
 * The full card number never reaches this service (input is a validated
 * `SimulatedCard` from `packages/shared`, which has no `number`/`pan`/`cvv`
 * field to begin with); only `brand`/`last4` are ever persisted or emitted.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly eventBus: EventBus,
    private readonly config: ConfigService,
  ) {}

  async simulate(input: SimulatePaymentInput): Promise<SimulatePaymentResult> {
    const { userId, amount, card } = input;
    const reason = this.evaluate(card);

    if (reason) {
      const payment = await this.repository.runTransaction(async (tx) => {
        const created = await this.repository.create(tx, {
          userId,
          amount,
          currency: CURRENCY,
          status: PaymentStatus.FAILED,
          cardBrand: card.brand,
          cardLast4: card.last4,
          simulated: true,
        });

        await this.eventBus.publish(
          {
            type: EventName.PAYMENT_FAILED,
            occurredAt: new Date(),
            payload: { paymentId: created.id, userId, reason },
          },
          tx,
        );

        return created;
      });

      return { status: PaymentStatus.FAILED, paymentId: payment.id, reason };
    }

    // Artificial latency for the approved path only, per rule 3 above.
    await this.delay();

    const payment = await this.repository.runTransaction(async (tx) => {
      const created = await this.repository.create(tx, {
        userId,
        amount,
        currency: CURRENCY,
        status: PaymentStatus.SUCCEEDED,
        cardBrand: card.brand,
        cardLast4: card.last4,
        simulated: true,
      });

      await this.eventBus.publish(
        {
          type: EventName.PAYMENT_SUCCEEDED,
          occurredAt: new Date(),
          payload: { paymentId: created.id, userId, amount },
        },
        tx,
      );

      return created;
    });

    return { status: PaymentStatus.SUCCEEDED, paymentId: payment.id };
  }

  private evaluate(card: SimulatedCard): PaymentFailureReason | undefined {
    if (card.last4 === '0000') return 'CARD_DECLINED';
    if (this.isExpired(card)) return 'CARD_EXPIRED';
    return undefined;
  }

  /**
   * Classic off-by-one trap: a card with `expMonth: 8, expYear: 2026` is
   * still valid throughout August 2026 and only becomes expired once
   * September starts. Comparing "now" against the FIRST instant of the month
   * AFTER expiration (rather than the first instant of the expiration month
   * itself) is what makes a same-month expiration still valid. Computed in
   * UTC to avoid a process-timezone-dependent flip near midnight.
   *
   * `card.expMonth` is 1-indexed (1 = January) while `Date.UTC`'s month
   * argument is 0-indexed, so passing `expMonth` straight through already
   * points at the FIRST day of the month right after expiration.
   */
  private isExpired(card: SimulatedCard): boolean {
    const startOfMonthAfterExpiry = new Date(Date.UTC(card.expYear, card.expMonth, 1));
    return startOfMonthAfterExpiry <= new Date();
  }

  private delay(): Promise<void> {
    const ms = this.config.get<number>('PAYMENT_SIMULATION_DELAY_MS', DEFAULT_SIMULATION_DELAY_MS);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
