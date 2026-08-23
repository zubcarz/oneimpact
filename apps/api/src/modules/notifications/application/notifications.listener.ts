import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@oneimpact/shared';
import type { DomainEvent } from '../../../infra/events/domain-event';
import { EventName } from '../../../infra/events/event-names';
import { NotificationsRepository } from '../infrastructure/notifications.repository';

/**
 * Minimal payload shapes this listener needs from each event it consumes.
 * Same pattern as `ImpactListener`/`UsersListener`: declaring the listener's
 * own minimal interface here -- instead of importing `auth`'s,
 * `subscriptions`'s or `projects`'s `domain/*.events.ts` -- keeps
 * `notifications` decoupled from those modules even at the type level. The
 * real payloads those modules emit (`UserRegisteredPayload`,
 * `SubscriptionActivatedPayload`, `ProjectUpdatePublishedPayload` in their
 * own modules) are strict supersets of the shapes declared below.
 */
export interface UserRegisteredPayload {
  userId: string;
  name: string;
}

export type UserRegisteredEvent = DomainEvent<
  typeof EventName.USER_REGISTERED,
  UserRegisteredPayload
>;

export interface SubscriptionActivatedPayload {
  userId: string;
  subscriptionId: string;
}

export type SubscriptionActivatedEvent = DomainEvent<
  typeof EventName.SUBSCRIPTION_ACTIVATED,
  SubscriptionActivatedPayload
>;

export interface ProjectUpdatePublishedPayload {
  projectId: string;
  updateId: string;
}

export type ProjectUpdatePublishedEvent = DomainEvent<
  typeof EventName.PROJECT_UPDATE_PUBLISHED,
  ProjectUpdatePublishedPayload
>;

/**
 * Three fan-out listeners, one per event `notifications` reacts to
 * (`06-api-payments-subscriptions-events.md`, "Modulo `notifications`").
 *
 * NON-NEGOTIABLE RULE, load-bearing for every handler below: the `refId`
 * passed to `NotificationsRepository.upsertNotification` is ALWAYS a
 * concrete, non-null id -- `userId` for `WELCOME`, `subscriptionId` for
 * `SUBSCRIPTION`, `updateId` for `PROJECT_UPDATE`. `Notification` declares
 * `@@unique([userId, type, refId])` in `schema.prisma` with `refId` nullable
 * at the column level, but Postgres NEVER treats two NULLs as equal for
 * uniqueness purposes -- a unique index simply never fires on a NULL vs NULL
 * comparison. Upserting with `refId: null` (e.g. "the welcome notification
 * has no natural id of its own") would therefore INSERT a new row on every
 * redelivery of the same event instead of deduplicating, which defeats the
 * whole point of an idempotent upsert. This is exactly the invariant
 * `notifications.listener.spec.ts` locks down for all three events, and full
 * reasoning also lives next to the upsert itself in
 * `NotificationsRepository.upsertNotification`'s doc.
 *
 * All three: try/catch, log without PII (ids only, never email/name/card
 * data), and NEVER rethrow toward the emitter -- the emitting module
 * (`auth`/`subscriptions`/`projects`) already committed its own transaction
 * by the time this runs.
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly repository: NotificationsRepository) {}

  @OnEvent(EventName.USER_REGISTERED)
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    try {
      await this.repository.upsertNotification({
        userId: event.payload.userId,
        type: NotificationType.WELCOME,
        refId: event.payload.userId,
        title: 'Bienvenida a One Impact',
        body: `Hola ${event.payload.name}, gracias por sumarte a One Impact.`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create welcome notification for user ${event.payload.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @OnEvent(EventName.SUBSCRIPTION_ACTIVATED)
  async handleSubscriptionActivated(event: SubscriptionActivatedEvent): Promise<void> {
    try {
      await this.repository.upsertNotification({
        userId: event.payload.userId,
        type: NotificationType.SUBSCRIPTION,
        refId: event.payload.subscriptionId,
        title: 'Suscripcion activada',
        body: 'Tu suscripcion se activo correctamente. Gracias por tu apoyo.',
      });
    } catch (error) {
      this.logger.error(
        `Failed to create subscription notification for subscription ${event.payload.subscriptionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * The only listener that fans out to MULTIPLE users from a single event.
   * Followers are resolved with `NotificationsRepository.findFollowerIds`,
   * which reads `ProjectFollow` directly through Prisma -- never through
   * `projects`'s `FollowsService` (`30-api-event-driven.md`: reading another
   * module's tables from infra is permitted, importing its services is
   * not). Copy is in Spanish (user-facing), the code around it in English.
   */
  @OnEvent(EventName.PROJECT_UPDATE_PUBLISHED)
  async handleProjectUpdatePublished(event: ProjectUpdatePublishedEvent): Promise<void> {
    const { projectId, updateId } = event.payload;
    try {
      const [project, followerIds] = await Promise.all([
        this.repository.findProjectTitle(projectId),
        this.repository.findFollowerIds(projectId),
      ]);
      const title = `Nuevo avance en ${project?.title ?? 'el proyecto'}`;
      const body = 'Se publico un nuevo avance del proyecto que seguis.';

      await Promise.all(
        followerIds.map((userId) =>
          this.repository.upsertNotification({
            userId,
            type: NotificationType.PROJECT_UPDATE,
            refId: updateId,
            title,
            body,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to create project update notifications for update ${updateId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
