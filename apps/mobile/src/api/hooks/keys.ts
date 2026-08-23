import type { ProjectsListParams } from '@oneimpact/api-client';

// Hierarchical, typed query keys. Every leaf starts with the same root
// ('plans', 'zones', ...) so `queryClient.invalidateQueries({ queryKey: queryKeys.zones.all() })`
// invalidates a whole resource by prefix, and a more specific key
// (`queryKeys.zones.detail(slug)`) invalidates just one entry.
export const queryKeys = {
  plans: {
    all: () => ['plans'] as const,
  },
  zones: {
    all: () => ['zones'] as const,
    list: () => ['zones', 'list'] as const,
    detail: (slug: string) => ['zones', 'detail', slug] as const,
  },
  projects: {
    all: () => ['projects'] as const,
    list: (params?: ProjectsListParams) => ['projects', 'list', params ?? {}] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  me: {
    detail: () => ['me'] as const,
  },
  dashboard: {
    detail: () => ['dashboard'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
  },
  subscription: {
    me: () => ['subscription', 'me'] as const,
  },
};
