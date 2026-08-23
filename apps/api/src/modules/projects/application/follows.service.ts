import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../common/errors/domain-error';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import type { ProjectFollowedEvent } from '../domain/projects.events';
import { FollowsRepository } from '../infrastructure/follows.repository';

/**
 * `follow`/`unfollow` a project. Both are idempotent by design: calling
 * either one twice with the same `(userId, projectId)` leaves the same
 * `ProjectFollow` state and never throws.
 *
 * `project.followed` is the only event this service ever publishes -- the
 * 8-event table (`backend-nest.md`, mirrored in `event-names.ts`) has no
 * `project.unfollowed`, so `unfollow` never calls `EventBus.publish`.
 */
@Injectable()
export class FollowsService {
  constructor(
    private readonly repository: FollowsRepository,
    private readonly eventBus: EventBus,
  ) {}

  async follow(userId: string, projectId: string): Promise<void> {
    await this.assertProjectExists(projectId);

    // `upsert` on the composite PK: a second `follow` call for the same pair
    // resolves the same row instead of throwing a unique constraint error.
    await this.repository.upsert(userId, projectId);

    const event: ProjectFollowedEvent = {
      type: EventName.PROJECT_FOLLOWED,
      occurredAt: new Date(),
      payload: { projectId, userId },
    };
    await this.eventBus.publish(event);
  }

  async unfollow(userId: string, projectId: string): Promise<void> {
    await this.assertProjectExists(projectId);

    // `deleteMany` resolves with `{ count: 0 }` instead of throwing when
    // there is nothing to delete, so unfollowing something never followed is
    // a no-op, not an error.
    await this.repository.remove(userId, projectId);
  }

  private async assertProjectExists(projectId: string): Promise<void> {
    const exists = await this.repository.projectExists(projectId);
    if (!exists) {
      throw DomainError.notFound('PROJECT_NOT_FOUND', `El proyecto "${projectId}" no existe.`);
    }
  }
}
