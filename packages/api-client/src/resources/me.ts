import { API_PATHS } from '@oneimpact/shared';
import type { UserProfile } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createMeResource(request: RequestFn) {
  return {
    get: () => request<UserProfile>(API_PATHS.me),
  };
}
