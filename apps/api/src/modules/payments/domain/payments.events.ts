import type { DomainEvent } from '../../../infra/events/domain-event';
import { EventName } from '../../../infra/events/event-names';

/**
 * Payload types for the two events owned by the `payments` module
 * (`backend-nest.md`, event table).
 *
 * INVARIANT: neither payload carries the full card number, nor even
 * `last4`/`brand`. `PaymentsService` already stores those on the persisted
 * `Payment` row (see `payments.repository.ts`); the events below only carry
 * ids, the amount and, on failure, a symbolic reason code. Anything
 * card-shaped never leaves this module through an event -- see
 * `30-api-event-driven.md`, "Pago simulado".
 */

/** Emitted when a simulated payment is approved. */
export type PaymentSucceededEvent = DomainEvent<
  typeof EventName.PAYMENT_SUCCEEDED,
  PaymentSucceededPayload
>;

export interface PaymentSucceededPayload {
  paymentId: string;
  userId: string;
  amount: number;
}

/** Emitted when a simulated payment is declined or the card is expired. */
export type PaymentFailedEvent = DomainEvent<typeof EventName.PAYMENT_FAILED, PaymentFailedPayload>;

export interface PaymentFailedPayload {
  paymentId: string;
  userId: string;
  reason: string;
}

/** Union of every event this module emits. */
export type PaymentsDomainEvent = PaymentSucceededEvent | PaymentFailedEvent;
