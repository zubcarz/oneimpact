import type { DomainEvent } from '../../../infra/events/domain-event';
import { EventName } from '../../../infra/events/event-names';

/**
 * Payload types for the three events owned by the `projects` module
 * (`backend-nest.md`, event table).
 *
 * IMPORTANT: this module only DEFINES these payload shapes, it does not
 * EMIT them yet. This spec (`02-api-catalog-and-projects`) is read-only:
 * `ProjectsService` never calls `EventBus.publish`. The emitters are added
 * by later items on the roadmap:
 * - `project.created` and `project.update_published` -> item 06 (project
 *   writes: create project, publish an update).
 * - `project.followed` -> item 11 (follow/unfollow a project).
 *
 * These types exist now so 06 and 11 have a fixed contract to import from
 * instead of inventing payload shapes ad hoc, and so this module's public
 * surface (what it will eventually emit) is visible from its own `domain/`
 * folder, per the module structure in `30-api-event-driven.md`.
 *
 * As with every `DomainEvent` payload, these are plain, JSON-serializable
 * objects built from ids -- never Prisma entities or nested domain objects.
 */

/** Emitted when a new project is created. Payload: only ids. */
export type ProjectCreatedEvent = DomainEvent<
  typeof EventName.PROJECT_CREATED,
  ProjectCreatedPayload
>;

export interface ProjectCreatedPayload {
  projectId: string;
  zoneId: string;
}

/** Emitted when a progress update is published for a project. */
export type ProjectUpdatePublishedEvent = DomainEvent<
  typeof EventName.PROJECT_UPDATE_PUBLISHED,
  ProjectUpdatePublishedPayload
>;

export interface ProjectUpdatePublishedPayload {
  projectId: string;
  updateId: string;
}

/** Emitted when a user follows a project. */
export type ProjectFollowedEvent = DomainEvent<
  typeof EventName.PROJECT_FOLLOWED,
  ProjectFollowedPayload
>;

export interface ProjectFollowedPayload {
  projectId: string;
  userId: string;
}

/** Union of every event this module will eventually emit. */
export type ProjectsDomainEvent =
  ProjectCreatedEvent | ProjectUpdatePublishedEvent | ProjectFollowedEvent;
