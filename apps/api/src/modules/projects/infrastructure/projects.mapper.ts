import type {
  Project as PrismaProject,
  ProjectUpdate as PrismaProjectUpdate,
  Zone as PrismaZone,
} from '@prisma/client';
import type { Project, ProjectUpdate, ProjectWithUpdates, Zone } from '@oneimpact/shared';
import type { ProjectWithUpdatesRow } from './projects.repository';

/**
 * Prisma -> `@oneimpact/shared` contract mappers for the `projects` module.
 *
 * Every function below MUST keep its explicit return type annotation
 * (`: Project`, `: ProjectUpdate`, `: ProjectWithUpdates`). Without it,
 * forgetting to map a field (or leaking a Prisma-only field like
 * `updatedAt`/`createdById`) would not be caught by the typecheck.
 */

export function toProject(row: PrismaProject): Project {
  return {
    id: row.id,
    slug: row.slug,
    zoneId: row.zoneId,
    title: row.title,
    summary: row.summary,
    description: row.description,
    status: row.status,
    progress: row.progress,
    targetDate: row.targetDate?.toISOString(),
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    coverKey: row.coverKey ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toProjectUpdate(row: PrismaProjectUpdate): ProjectUpdate {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    body: row.body,
    progress: row.progress,
    mediaKey: row.mediaKey ?? undefined,
    publishedAt: row.publishedAt.toISOString(),
    authorId: row.authorId ?? undefined,
  };
}

/**
 * `Zone` mapper local to this module (not imported from `catalog`): the
 * domain rules forbid cross-module imports outside the `catalog` service
 * exception, and this is a plain field mapping, not a service call.
 */
function toZoneRow(row: PrismaZone): Zone {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageKey: row.imageKey,
    order: row.order,
  };
}

export function toProjectWithUpdates(row: ProjectWithUpdatesRow): ProjectWithUpdates {
  return {
    ...toProject(row),
    updates: row.updates.map(toProjectUpdate),
    zone: toZoneRow(row.zone),
  };
}
