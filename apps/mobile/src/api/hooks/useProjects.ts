import { useQuery } from '@tanstack/react-query';
import type { ProjectsListParams } from '@oneimpact/api-client';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/**
 * `GET /v1/projects` with optional `zoneSlug`/`status` filters, returned as
 * the `{ items, total }` envelope. The query key includes `params` so each
 * distinct filter combination is cached independently.
 */
export function useProjects(params?: ProjectsListParams) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => callApi((api) => api.projects.list(params)),
  });
}

/**
 * `GET /v1/projects/:id`, returns `ProjectWithUpdates`. Disabled until an id
 * is available.
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => callApi((api) => api.projects.get(id as string)),
    enabled: Boolean(id),
  });
}
