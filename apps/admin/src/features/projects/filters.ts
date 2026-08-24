import type { ProjectsListParams } from '@oneimpact/api-client';
import { ProjectStatus, zoneSlugSchema } from '@oneimpact/shared';

/**
 * Filters of the projects list: URL <-> `ProjectsListParams`.
 *
 * The URL is the single source of truth for the filters (the `Select`s do not
 * keep their own state), so this module is the only place that decides what a
 * query string means. Anything that is not a real filter is dropped in silence:
 * `/projects?status=lo-que-sea` has to render the full list, not an error page
 * and not a 400 coming back from the API.
 *
 * Validation is not redefined here. The slug goes through `zoneSlugSchema` and
 * the status through the `ProjectStatus` enum, both from `packages/shared`.
 */

/**
 * `searchParams` of a Next 16 page, already awaited by the caller (in Next 16 it
 * arrives as a `Promise`).
 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

const PROJECT_STATUSES: readonly string[] = Object.values(ProjectStatus);

/**
 * Takes the first occurrence of a repeated parameter (`?status=A&status=B`).
 *
 * Node parses it as an array; the API accepts a single value. First wins, which
 * matches what `new URLSearchParams(...).get()` does, so a hand written link and
 * a link built by `serializeProjectsFilters` behave the same.
 */
function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUSES.includes(value);
}

/** Reads `?zoneSlug=&status=` and keeps only the values the API can serve. */
export function parseProjectsFilters(searchParams: RawSearchParams): ProjectsListParams {
  const params: ProjectsListParams = {};

  const zoneSlug = firstValue(searchParams.zoneSlug);
  // `zoneSlugSchema` is `/^[a-z0-9-]+$/`, so it already rejects the empty
  // string, uppercase and surrounding spaces. No trimming here on purpose: a
  // trim would turn " amazonia" into a valid filter that the user never typed.
  if (zoneSlug !== undefined && zoneSlugSchema.safeParse(zoneSlug).success) {
    params.zoneSlug = zoneSlug;
  }

  const status = firstValue(searchParams.status);
  if (status !== undefined && isProjectStatus(status)) {
    params.status = status;
  }

  return params;
}

/**
 * Builds the query string for `router.replace`, empty keys omitted.
 *
 * Returns `''` or `'?...'` so the caller can write `/projects${qs}` and land on
 * a clean `/projects` when nothing is filtered, instead of the
 * `/projects?zoneSlug=&status=` that a naive `URLSearchParams` would leave.
 */
export function serializeProjectsFilters(params: ProjectsListParams): string {
  const search = new URLSearchParams();

  if (params.zoneSlug) search.set('zoneSlug', params.zoneSlug);
  if (params.status) search.set('status', params.status);

  const query = search.toString();
  return query ? `?${query}` : '';
}
