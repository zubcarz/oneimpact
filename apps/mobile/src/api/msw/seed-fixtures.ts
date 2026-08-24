import { SEED_PROJECTS, SEED_ZONES } from '@oneimpact/shared';
import type { Project, ProjectUpdate, Zone } from '@oneimpact/shared';

/**
 * Maps the shared seed dataset (`packages/shared/src/seed-data.ts`) to the
 * exact REST contract types (`Zone`, `Project`, `ProjectUpdate` from
 * `packages/shared/src/types/catalog.ts`) so MSW handlers can serve the same
 * shape the real API returns.
 *
 * `SeedZone`/`SeedProject`/`SeedProjectUpdate` omit fields that Postgres
 * assigns (`id`, `zoneId`, `createdAt`, `projectId`, `authorId`). Those
 * fields are synthesized here in a deterministic way -- no `Math.random()`
 * or `Date.now()` -- so the same seed always produces the same fixtures
 * across renders and test runs.
 *
 * Id conventions:
 * - Zone id: `zone-<slug>`.
 * - Project id: `project-<slug>`.
 * - Update id: taken as-is from the seed (already unique, e.g. `guainia-update-1`).
 *
 * `createdAt` for a project is derived from its own seed data: the
 * `publishedAt` of its first update (the earliest record we have of the
 * project existing). Projects without updates fall back to
 * `FALLBACK_PROJECT_CREATED_AT`, a fixed constant -- none of the current
 * seed projects hit this path, but the mapper must stay total.
 *
 * `authorId` for every update is `SEED_ADMIN_AUTHOR_ID`, a constant standing
 * in for the admin account that publishes advances in the demo dataset. The
 * seed does not track per-update authors, so a single stable id is used
 * for all of them.
 */
export const SEED_ADMIN_AUTHOR_ID = 'user-admin-seed';

const FALLBACK_PROJECT_CREATED_AT = '2026-01-01T00:00:00.000Z';

function zoneId(slug: string): string {
  return `zone-${slug}`;
}

function projectId(slug: string): string {
  return `project-${slug}`;
}

export const seedZonesFixture: Zone[] = SEED_ZONES.map((zone) => ({
  ...zone,
  id: zoneId(zone.slug),
}));

const zoneIdBySlug = new Map(seedZonesFixture.map((zone) => [zone.slug, zone.id]));

function resolveZoneId(zoneSlug: string): string {
  const id = zoneIdBySlug.get(zoneSlug);
  if (!id) {
    throw new Error(`seed-fixtures: unknown zoneSlug "${zoneSlug}" in SEED_PROJECTS`);
  }
  return id;
}

export const seedProjectsFixture: Project[] = SEED_PROJECTS.map((project) => {
  const { zoneSlug, updates, ...rest } = project;
  const createdAt = updates[0]?.publishedAt ?? FALLBACK_PROJECT_CREATED_AT;

  return {
    ...rest,
    id: projectId(project.slug),
    zoneId: resolveZoneId(zoneSlug),
    createdAt,
  };
});

export const seedProjectUpdatesFixture: ProjectUpdate[] = SEED_PROJECTS.flatMap((project) =>
  project.updates.map((update) => ({
    ...update,
    projectId: projectId(project.slug),
    authorId: SEED_ADMIN_AUTHOR_ID,
  })),
);
