import type { Billing, PlanId } from '@oneimpact/shared';
import type { DomainEvent } from '../../../infra/events/domain-event';
import { EventName } from '../../../infra/events/event-names';

/**
 * Payload types for the two events owned by the `subscriptions` module
 * (`backend-nest.md`, event table).
 *
 * COMPATIBILITY: `UsersListener` (`modules/users/application/users.listener.ts`)
 * already declares its own, minimal `SubscriptionActivatedPayload { userId }`
 * and already listens for `EventName.SUBSCRIPTION_ACTIVATED`. The richer
 * payload below is a strict superset of that shape (it still carries
 * `userId`), so `UsersListener` keeps working unmodified once this module
 * starts emitting -- that is the intended proof that the event bus lets two
 * modules cooperate without either importing the other's service.
 */

export type SubscriptionActivatedEvent = DomainEvent<
  typeof EventName.SUBSCRIPTION_ACTIVATED,
  SubscriptionActivatedPayload
>;

export interface SubscriptionActivatedPayload {
  userId: string;
  subscriptionId: string;
  planId: PlanId;
  billing: Billing;
}

/** Emitted when a subscription is canceled. */
export type SubscriptionCanceledEvent = DomainEvent<
  typeof EventName.SUBSCRIPTION_CANCELED,
  SubscriptionCanceledPayload
>;

export interface SubscriptionCanceledPayload {
  userId: string;
  subscriptionId: string;
}

/** Union of every event this module emits. */
export type SubscriptionsDomainEvent = SubscriptionActivatedEvent | SubscriptionCanceledEvent;
