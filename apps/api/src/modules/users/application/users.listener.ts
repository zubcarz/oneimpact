import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { DomainEvent } from '../../../infra/events/domain-event';
import { EventName } from '../../../infra/events/event-names';
import { UsersRepository } from '../infrastructure/users.repository';

/**
 * Minimal shape this listener needs from `subscription.activated`. The full
 * payload is owned by the `subscriptions` module (not built yet, see the
 * roadmap item that emits it); this listener only reads `userId`.
 */
export interface SubscriptionActivatedPayload {
  userId: string;
}

export type SubscriptionActivatedEvent = DomainEvent<
  typeof EventName.SUBSCRIPTION_ACTIVATED,
  SubscriptionActivatedPayload
>;

/**
 * Marks onboarding as completed the first time a user's subscription is
 * activated. Idempotent: `UsersRepository.markOnboardingCompleted` sets a
 * boolean unconditionally, so handling the same event twice (at-least-once
 * delivery is expected, see `30-api-event-driven.md`) leaves the exact same
 * final state.
 *
 * Never throws: if the update fails, the emitter (`subscriptions`) already
 * committed its own transaction and must not be aborted by a listener
 * failure. The error is logged with the event's `userId` only -- no PII,
 * no token, no password, nothing beyond the id already carried by the event.
 */
@Injectable()
export class UsersListener {
  private readonly logger = new Logger(UsersListener.name);

  constructor(private readonly repository: UsersRepository) {}

  @OnEvent(EventName.SUBSCRIPTION_ACTIVATED)
  async handleSubscriptionActivated(event: SubscriptionActivatedEvent): Promise<void> {
    try {
      await this.repository.markOnboardingCompleted(event.payload.userId);
    } catch (error) {
      this.logger.error(
        `Failed to mark onboarding completed for user ${event.payload.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
