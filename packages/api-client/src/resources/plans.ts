import { API_PATHS } from '@oneimpact/shared';
import type { Plan } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createPlansResource(request: RequestFn) {
  return {
    list: () => request<Plan[]>(API_PATHS.plans),
  };
}
