import { Injectable } from '@nestjs/common';
import type {
  CreateProjectInput,
  Project,
  ProjectUpdate,
  PublishUpdateInput,
  UpdateProjectInput,
} from '@oneimpact/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import type { ProjectCreatedEvent, ProjectUpdatePublishedEvent } from '../domain/projects.events';
import { toProject, toProjectUpdate } from '../infrastructure/projects.mapper';
import { ProjectsRepository } from '../infrastructure/projects.repository';

/**
 * Write-side application service for the `projects` module. Deliberately
 * separate from `ProjectsService` (read-only, `projects.service.ts`): mixing
 * reads and writes in one file would make it grow past the "one file, one
 * responsibility" convention and would hide, behind a shared class, that the
 * two halves have very different concerns (reads have no events, writes do).
 *
 * No `CatalogService` injection: `zoneSlug` -> `zoneId` resolution happens in
 * `ProjectsRepository.findZoneIdBySlug`, a plain Prisma lookup, per the
 * plan's explicit instruction not to reach into `catalog` for this.
 */
@Injectable()
export class ProjectsWritesService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly eventBus: EventBus,
  ) {}

  async create(input: CreateProjectInput, adminId: string): Promise<Project> {
    const zoneId = await this.repository.findZoneIdBySlug(input.zoneSlug);
    if (!zoneId) {
      throw DomainError.notFound('ZONE_NOT_FOUND', `La zona "${input.zoneSlug}" no existe.`);
    }

    const slug = await this.deriveUniqueSlug(input.title);

    const created = await this.repository.runTransaction(async (tx) => {
      const row = await this.repository.create(tx, {
        slug,
        zoneId,
        title: input.title,
        summary: input.summary,
        description: input.description,
        status: input.status,
        progress: input.progress,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        lat: input.lat,
        lng: input.lng,
        coverKey: input.coverKey,
        createdById: adminId,
      });

      const event: ProjectCreatedEvent = {
        type: EventName.PROJECT_CREATED,
        occurredAt: new Date(),
        payload: { projectId: row.id, zoneId: row.zoneId },
      };
      await this.eventBus.publish(event, tx);

      return row;
    });

    return toProject(created);
  }

  /**
   * No event published here: the 8-event table (`backend-nest.md`, mirrored
   * in `event-names.ts`) has no `project.updated`. Adding one would be
   * inventing a 9th event outside the plan's fixed contract.
   */
  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw DomainError.notFound('PROJECT_NOT_FOUND', `El proyecto "${id}" no existe.`);
    }

    const updated = await this.repository.update(id, {
      title: input.title,
      summary: input.summary,
      description: input.description,
      status: input.status,
      progress: input.progress,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      lat: input.lat,
      lng: input.lng,
      coverKey: input.coverKey,
    });

    return toProject(updated);
  }

  async publishUpdate(
    projectId: string,
    input: PublishUpdateInput,
    authorId: string,
  ): Promise<ProjectUpdate> {
    const existing = await this.repository.findById(projectId);
    if (!existing) {
      throw DomainError.notFound('PROJECT_NOT_FOUND', `El proyecto "${projectId}" no existe.`);
    }

    const created = await this.repository.runTransaction(async (tx) => {
      const row = await this.repository.createUpdate(tx, {
        projectId,
        title: input.title,
        body: input.body,
        progress: input.progress,
        // `publishUpdateSchema.mediaUrl` (packages/shared) is stored verbatim
        // in `ProjectUpdate.mediaKey`. This is decision D5a of
        // `.claude/plans/20260822-api-payments-subscriptions-events.plan.md`:
        // the field is named differently on each side of the contract ON
        // PURPOSE (the value is whatever `POST /v1/uploads/sign` returned --
        // a relative storage key or an absolute URL, both resolve at the
        // edge) rather than renaming a Prisma column mid-wave-3. This is NOT
        // a copy-paste bug.
        mediaKey: input.mediaUrl,
        authorId,
      });

      // Recalculating `Project.progress` from the just-published update's
      // `progress`, in the SAME transaction, is what the spec asks for
      // ("recalcula project.progress"). It intentionally OVERWRITES whatever
      // an admin last set via `PATCH /v1/projects/:id` -- again, not a bug,
      // see the plan's phase-3 risk note.
      await this.repository.updateProgress(tx, projectId, input.progress);

      const event: ProjectUpdatePublishedEvent = {
        type: EventName.PROJECT_UPDATE_PUBLISHED,
        occurredAt: new Date(),
        payload: { projectId, updateId: row.id },
      };
      await this.eventBus.publish(event, tx);

      return row;
    });

    return toProjectUpdate(created);
  }

  /**
   * Derives a URL-safe slug from `title` (lowercase, accents stripped,
   * non-alphanumeric runs collapsed to a single `-`, no leading/trailing
   * `-`), then resolves collisions against the DB with a `-2`, `-3`, ...
   * suffix (decision D4a). Queries the DB on every attempt instead of
   * assuming uniqueness, per the plan's explicit instruction.
   */
  private async deriveUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'proyecto';
    return this.firstAvailableSlug(base, base, 2);
  }

  /**
   * Checks `candidate` against the DB and, on collision, recurses with the
   * next `-N` suffix. Recursive (not a `while` loop with `await` inside) so
   * each lookup is a plain, sequential `await` at the top level of a
   * function body -- the DB is the source of truth for every attempt, per
   * the plan's explicit instruction not to assume uniqueness.
   */
  private async firstAvailableSlug(
    candidate: string,
    base: string,
    suffix: number,
  ): Promise<string> {
    const taken = await this.repository.slugExists(candidate);
    if (!taken) return candidate;
    return this.firstAvailableSlug(`${base}-${suffix}`, base, suffix + 1);
  }
}

/**
 * Strips combining diacritical marks (Unicode block `U+0300`-`U+036F`) left
 * behind by `String.prototype.normalize('NFD')`, e.g. turning "árbol" into
 * "arbol" before it gets lowercased and dash-collapsed.
 */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
