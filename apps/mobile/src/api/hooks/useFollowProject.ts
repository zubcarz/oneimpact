import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

// NOTE (D5, plan 20260822-mobile-data-layer-and-auth): `POST/DELETE
// /v1/projects/:id/follow` is not implemented by the API yet (only the two
// `@Get` routes exist). Only MSW (Phase 3) serves this until then.
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
