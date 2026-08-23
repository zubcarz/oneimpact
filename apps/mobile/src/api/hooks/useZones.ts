import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/** `GET /v1/zones`, returned as the `{ items, total }` envelope. */
export function useZones() {
  return useQuery({
    queryKey: queryKeys.zones.list(),
    queryFn: () => callApi((api) => api.zones.list()),
  });
}

/**
 * `GET /v1/zones/:slug`, returns `Zone & { projects: Project[] }`. Disabled
 * until a slug is available (e.g. route param not resolved yet) so we never
 * fire a request against `/v1/zones/undefined`.
 */
export function useZone(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.zones.detail(slug ?? ''),
    queryFn: () => callApi((api) => api.zones.get(slug as string)),
    enabled: Boolean(slug),
  });
}
