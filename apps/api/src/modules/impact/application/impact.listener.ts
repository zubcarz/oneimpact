import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JourneySource } from '@prisma/client';
import type { DomainEvent } from '../../../infra/events/domain-event';
import { EventName } from '../../../infra/events/event-names';
import { ImpactRepository } from '../infrastructure/impact.repository';

/**
 * Minimal shape this listener needs from `subscription.activated` /
 * `subscription.canceled`. Same pattern as `UsersListener`
 * (`modules/users/application/users.listener.ts`): declaring the listener's
 * own, minimal payload interface instead of importing
 * `modules/subscriptions/domain/subscriptions.events.ts` keeps `impact`
 * decoupled from `subscriptions` even at the type level. The richer payload
 * `subscriptions` actually emits is a strict superset of both shapes below.
 */
export interface SubscriptionActivatedPayload {
  userId: string;
  subscriptionId: string;
}

export type SubscriptionActivatedEvent = DomainEvent<
  typeof EventName.SUBSCRIPTION_ACTIVATED,
  SubscriptionActivatedPayload
>;

export interface SubscriptionCanceledPayload {
  userId: string;
  subscriptionId: string;
}

export type SubscriptionCanceledEvent = DomainEvent<
  typeof EventName.SUBSCRIPTION_CANCELED,
  SubscriptionCanceledPayload
>;

/**
 * `month` is always computed in UTC, never with the process's local
 * timezone. Close to a month boundary, a local timezone can push the
 * calendar date into the previous or next month depending on where the
 * server happens to run, which would make the idempotency invariant below
 * intermittent right at that boundary. `event.occurredAt` may already be a
 * serialized ISO string (see `DomainEvent`'s class doc) -- `new Date(...)`
 * on a `Date` is a no-op, so this handles both.
 */
function toUtcMonth(occurredAt: Date | string): string {
  const date = typeof occurredAt === 'string' ? new Date(occurredAt) : occurredAt;
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

/**
 * First and only listener that turns a subscription activation into a
 * "journey point" (`impact`'s domain concept): proof that `subscriptions`
 * never had to know `impact` exists.
 */
@Injectable()
export class ImpactListener {
  private readonly logger = new Logger(ImpactListener.name);

  constructor(private readonly repository: ImpactRepository) {}

  /**
   * Idempotent by construction: `ImpactRepository.upsertJourneyPoint` upserts
   * on the real natural key `[userId, month, source]`, so delivering this
   * event twice (at-least-once delivery is expected, see
   * `30-api-event-driven.md`) leaves exactly one row. Never throws toward the
   * emitter: `subscriptions` already committed its transaction by the time
   * this runs, and a failure here must not undo that. Logged without PII --
   * only the ids already carried by the event.
   */
  @OnEvent(EventName.SUBSCRIPTION_ACTIVATED)
  async handleSubscriptionActivated(event: SubscriptionActivatedEvent): Promise<void> {
    try {
      await this.repository.upsertJourneyPoint({
        userId: event.payload.userId,
        month: toUtcMonth(event.occurredAt),
        source: JourneySource.SUBSCRIPTION,
        refId: event.payload.subscriptionId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record journey point for subscription ${event.payload.subscriptionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Deliberately empty. A journey point marks that a travesia moment already
   * happened -- the user activated a subscription that month -- and canceling
   * the subscription later does not un-happen it. Journey points are
   * permanent history: they are never deleted or decremented on
   * cancellation. This handler exists (instead of simply not subscribing to
   * `subscription.canceled` at all) so that decision is documented in code,
   * not only in the plan.
   */
  @OnEvent(EventName.SUBSCRIPTION_CANCELED)
  handleSubscriptionCanceled(): void {
    // Intentionally empty -- see method doc above. The parameter is dropped
    // (instead of named and unused) rather than typed as
    // `SubscriptionCanceledEvent` for a body that never reads it.
  }
}
