import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateSubscriptionInput } from '@oneimpact/shared';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/**
 * `POST /v1/subscriptions`. On success, the dashboard summary and the
 * current subscription both depend on the new state, so both are
 * invalidated to refetch.
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) =>
      callApi((api) => api.subscriptions.create(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.detail() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.me() });
    },
  });
}
