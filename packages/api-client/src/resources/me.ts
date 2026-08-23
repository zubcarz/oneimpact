import { API_PATHS } from '@oneimpact/shared';
import type { UpdateProfileInput, UserProfile } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createMeResource(request: RequestFn) {
  return {
    get: () => request<UserProfile>(API_PATHS.me),
    update: (input: UpdateProfileInput) =>
      request<UserProfile>(API_PATHS.me, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  };
}
