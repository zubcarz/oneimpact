import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/** Plans rarely change; the list envelope (`{ items, total }`) is returned as-is. */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans.all(),
    queryFn: () => callApi((api) => api.plans.list()),
  });
}
