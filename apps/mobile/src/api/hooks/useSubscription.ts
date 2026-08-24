import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/**
 * `GET /v1/subscriptions/me` returns 404 `SUBSCRIPTION_NOT_FOUND` when the
 * user has no active subscription -- that is an expected state, not a
 * transient failure, so `retry` is disabled to avoid hammering the API on
 * every mount.
 */
export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription.me(),
    queryFn: () => callApi((api) => api.subscriptions.me()),
    retry: false,
  });
}

/**
 * `DELETE /v1/subscriptions/me`. On success, the dashboard summary and the
 * current subscription both depend on the new state, so both are
 * invalidated to refetch.
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => callApi((api) => api.subscriptions.cancel()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.detail() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.me() });
    },
  });
}
