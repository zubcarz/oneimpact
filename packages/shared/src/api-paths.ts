/**
 * REST contract paths, versioned under /v1. Shared by apps/api routing,
 * packages/api-client and mobile MSW handlers so no string is duplicated.
 */
export const API_PATHS = {
  auth: {
    register: '/v1/auth/register',
    login: '/v1/auth/login',
    refresh: '/v1/auth/refresh',
    logout: '/v1/auth/logout',
  },
  me: '/v1/me',
  plans: '/v1/plans',
  zones: {
    list: '/v1/zones',
    bySlug: (slug: string) => `/v1/zones/${slug}`,
  },
  projects: {
    list: '/v1/projects',
    byId: (id: string) => `/v1/projects/${id}`,
    updates: (id: string) => `/v1/projects/${id}/updates`,
    follow: (id: string) => `/v1/projects/${id}/follow`,
  },
  subscriptions: '/v1/subscriptions',
  subscriptionsMe: '/v1/subscriptions/me',
  dashboardMe: '/v1/dashboard/me',
  notificationsMe: '/v1/notifications/me',
  admin: {
    metrics: '/v1/admin/metrics',
    users: '/v1/admin/users',
    userRole: (id: string) => `/v1/admin/users/${id}/role`,
  },
} as const;
