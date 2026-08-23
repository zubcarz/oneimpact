import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventName } from '../../../infra/events/event-names';
import type {
  PaymentFailedEvent,
  PaymentSucceededEvent,
} from '../../payments/domain/payments.events';

/**
 * Audit-only listener on the two `payments` events. The flow that decides
 * whether `POST /v1/subscriptions` succeeds or answers 402 is entirely
 * SYNCHRONOUS inside `SubscriptionsService.create` (decision D2a) -- these
 * handlers do NOT drive that decision. They exist so a payment outcome is
 * always logged even when it did not happen inside a subscription creation
 * (e.g. a future retry flow), and to give `notifications` (a later phase of
 * this plan) a working precedent for its own `@OnEvent` listeners.
 *
 * `PaymentSucceededPayload`/`PaymentFailedPayload`
 * (`modules/payments/domain/payments.events.ts`) never carry card data --
 * only ids, `amount` and, on failure, a symbolic `reason` -- so there is
 * nothing card-shaped to leak here even by mistake.
 *
 * Never throws toward the emitter: `payments` already committed its own
 * `Payment` row by the time either handler below runs.
 */
@Injectable()
export class SubscriptionsListener {
  constructor(private readonly logger: Logger) {}

  @OnEvent(EventName.PAYMENT_SUCCEEDED)
  handlePaymentSucceeded(event: PaymentSucceededEvent): void {
    try {
      this.logger.log(
        `payment.succeeded audited: payment=${event.payload.paymentId} user=${event.payload.userId} amount=${event.payload.amount}`,
        SubscriptionsListener.name,
      );
    } catch (error) {
      this.logger.error(
        `Failed to audit payment.succeeded for payment ${event.payload.paymentId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent(EventName.PAYMENT_FAILED)
  handlePaymentFailed(event: PaymentFailedEvent): void {
    try {
      this.logger.warn(
        `payment.failed audited: payment=${event.payload.paymentId} user=${event.payload.userId} reason=${event.payload.reason}`,
        SubscriptionsListener.name,
      );
    } catch (error) {
      this.logger.error(
        `Failed to audit payment.failed for payment ${event.payload.paymentId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
