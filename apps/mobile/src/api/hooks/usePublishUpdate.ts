import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PublishUpdateInput } from '@oneimpact/shared';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/**
 * `POST /v1/projects/:id/updates`. On success, the project detail, the
 * projects list and the dashboard's `latestUpdate` all depend on the new
 * update, so all three are invalidated to refetch.
 */
export function usePublishUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PublishUpdateInput }) =>
      callApi((api) => api.projects.publishUpdate(id, input)),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.detail() });
    },
  });
}
