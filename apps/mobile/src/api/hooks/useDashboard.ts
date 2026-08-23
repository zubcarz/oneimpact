import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

// NOTE (D5, plan 20260822-mobile-data-layer-and-auth): the API does not serve
// `GET /v1/dashboard/me` yet (it lands with items 06/12). Until then this
// hook only resolves data through MSW (Phase 3); against the real API it
// will 404 and surface as a normal query error.
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.detail(),
    queryFn: () => callApi((api) => api.dashboard.me()),
  });
}
