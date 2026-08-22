import { API_PATHS } from '@oneimpact/shared';
import type { DashboardSummary } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createDashboardResource(request: RequestFn) {
  return {
    me: () => request<DashboardSummary>(API_PATHS.dashboardMe),
  };
}
