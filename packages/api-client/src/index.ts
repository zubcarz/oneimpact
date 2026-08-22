import { ApiError, createRequestFn } from './http';
import type { ApiClientOptions } from './http';
import { createAdminResource } from './resources/admin';
import { createAuthResource } from './resources/auth';
import { createDashboardResource } from './resources/dashboard';
import { createMeResource } from './resources/me';
import { createNotificationsResource } from './resources/notifications';
import { createPlansResource } from './resources/plans';
import { createProjectsResource } from './resources/projects';
import { createSubscriptionsResource } from './resources/subscriptions';
import { createZonesResource } from './resources/zones';

export { ApiError };
export type { ApiClientOptions } from './http';
export type { AdminMetrics } from './resources/admin';
export type { ProjectsListParams } from './resources/projects';

/** Typed fetch wrapper shared by mobile and admin, covering the full REST contract. */
export function createApiClient(options: ApiClientOptions) {
  const request = createRequestFn(options);
  return {
    health: () => request<{ status: string }>('/health'),
    auth: createAuthResource(request),
    me: createMeResource(request),
    plans: createPlansResource(request),
    zones: createZonesResource(request),
    projects: createProjectsResource(request),
    subscriptions: createSubscriptionsResource(request),
    dashboard: createDashboardResource(request),
    notifications: createNotificationsResource(request),
    admin: createAdminResource(request),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
