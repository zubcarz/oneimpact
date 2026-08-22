import { API_PATHS } from '@oneimpact/shared';
import type { Role, UserProfile } from '@oneimpact/shared';
import type { RequestFn } from '../http';

/** Not part of the shared REST contract yet: aggregate shape returned only by admin/metrics. */
export interface AdminMetrics {
  users: number;
  activeSubscriptions: Record<string, number>;
  simulatedMrr: number;
  projectsByStatus: Record<string, number>;
}

export function createAdminResource(request: RequestFn) {
  return {
    metrics: () => request<AdminMetrics>(API_PATHS.admin.metrics),
    users: () => request<{ items: UserProfile[]; total: number }>(API_PATHS.admin.users),
    setRole: (id: string, role: Role) =>
      request<UserProfile>(API_PATHS.admin.userRole(id), {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
  };
}
