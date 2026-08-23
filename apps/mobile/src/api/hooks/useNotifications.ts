import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

// NOTE (D5, plan 20260822-mobile-data-layer-and-auth): same caveat as
// useDashboard -- `GET /v1/notifications/me` is only served by MSW (Phase 3)
// until the API implements it.
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: () => callApi((api) => api.notifications.me()),
  });
}
