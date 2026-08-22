import { API_PATHS } from '@oneimpact/shared';
import type { Project, Zone } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createZonesResource(request: RequestFn) {
  return {
    list: () => request<{ items: Zone[]; total: number }>(API_PATHS.zones.list),
    get: (slug: string) => request<Zone & { projects: Project[] }>(API_PATHS.zones.bySlug(slug)),
  };
}
