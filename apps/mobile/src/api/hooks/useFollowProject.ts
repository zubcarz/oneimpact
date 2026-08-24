import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

// `POST/DELETE /v1/projects/:id/follow` is implemented by the API
// (`apps/api/src/modules/projects/application/follows.service.ts`, item 06 --
// `.claude/plans/20260822-api-payments-subscriptions-events.plan.md`, `d35604f`)
// and mirrored by MSW (`src/api/msw/handlers.ts`). Both are idempotent, so a
// retried mutation is safe.
export function useFollowProject() {
  const queryClient = useQueryClient();

  const invalidate = (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.detail() });
  };

  const follow = useMutation({
    mutationFn: (id: string) => callApi((api) => api.projects.follow(id)),
    onSuccess: (_data, id) => invalidate(id),
  });

  const unfollow = useMutation({
    mutationFn: (id: string) => callApi((api) => api.projects.unfollow(id)),
    onSuccess: (_data, id) => invalidate(id),
  });

  return { follow, unfollow };
}
