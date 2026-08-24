import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/**
 * `PATCH /v1/notifications/:id/read`. On success, the notifications list and
 * the dashboard's `unreadNotifications` badge both depend on the new read
 * state, so both are invalidated to refetch.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => callApi((api) => api.notifications.markRead(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.detail() });
    },
  });
}
