import { useQuery } from '@tanstack/react-query';
import { callApi } from '@/api/client';
import { queryKeys } from './keys';

/**
 * `GET /v1/me`. Note this is a plain read hook; the session-owning
 * `AuthProvider` (Phase 4) is responsible for deciding when to call it and
 * for reacting to a 401 (via the session-expired listener in
 * `src/auth/token-store.ts`), not this hook.
 */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me.detail(),
    queryFn: () => callApi((api) => api.me.get()),
  });
}
