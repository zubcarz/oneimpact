'use client';

import { useQuery } from '@tanstack/react-query';
import { browserApi } from '@/lib/api-browser';
import { queryKeys } from '@/lib/query-keys';

/**
 * The five zones of One Impact, for the selects of the panel.
 *
 * `GET /v1/zones` is public on the API, but it is requested through
 * `/api/gateway` like everything else so there is a single way out of the
 * browser and no second base URL to keep in sync.
 */

/**
 * An hour, well above the 30 s default of the provider.
 *
 * Zones are the closest thing this product has to immutable catalogue: there are
 * five, they come from the seed and no screen of the panel creates or edits one
 * (`/zones` is still a placeholder of item 13). Refetching them every time a
 * form mounts would be pure noise on the network for data that has not changed
 * since deploy. An hour still bounds the staleness, so a zone added straight in
 * the database shows up in the same session without a hard reload.
 */
const ZONES_STALE_TIME_MS = 60 * 60 * 1000;

export function useZones() {
  return useQuery({
    queryKey: queryKeys.zones.list(),
    queryFn: () => browserApi.zones.list(),
    // The API answers `{ items, total }`; `select` unwraps it so every caller
    // gets the array and the cached entry stays the raw response.
    select: (response) => response.items,
    staleTime: ZONES_STALE_TIME_MS,
  });
}
