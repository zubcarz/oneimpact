import type { ProjectsListParams } from '@oneimpact/api-client';

/**
 * Hierarchical, typed query keys, same shape as the mobile app
 * (`apps/mobile/src/api/hooks/keys.ts`).
 *
 * Every leaf starts with the same root ('zones', 'projects', ...), so
 * `invalidateQueries({ queryKey: queryKeys.projects.all() })` drops the whole
 * resource by prefix while `queryKeys.projects.detail(id)` drops a single entry.
 * Keeping the two apps on the same shape means an invalidation rule reads the
 * same on both sides and cannot quietly stop matching here.
 *
 * Only the resources the panel reads from the browser live here. Everything the
 * Server Components fetch (the projects table, the project being edited) is not
 * in this cache at all: it is refreshed with `router.refresh()`.
 */
export const queryKeys = {
  zones: {
    all: () => ['zones'] as const,
    list: () => ['zones', 'list'] as const,
  },
  projects: {
    all: () => ['projects'] as const,
    list: (params?: ProjectsListParams) => ['projects', 'list', params ?? {}] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
};
