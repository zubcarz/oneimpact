import { API_PATHS } from '@oneimpact/shared';
import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
  ProjectUpdate,
  ProjectWithUpdates,
  PublishUpdateInput,
  UpdateProjectInput,
} from '@oneimpact/shared';
import type { RequestFn } from '../http';

export interface ProjectsListParams {
  zoneSlug?: string;
  status?: ProjectStatus;
}

function buildProjectsQuery(params?: ProjectsListParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.zoneSlug !== undefined) search.set('zoneSlug', params.zoneSlug);
  if (params.status !== undefined) search.set('status', params.status);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function createProjectsResource(request: RequestFn) {
  return {
    list: (params?: ProjectsListParams) =>
      request<{ items: Project[]; total: number }>(
        API_PATHS.projects.list + buildProjectsQuery(params),
      ),
    get: (id: string) => request<ProjectWithUpdates>(API_PATHS.projects.byId(id)),
    create: (input: CreateProjectInput) =>
      request<Project>(API_PATHS.projects.list, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateProjectInput) =>
      request<Project>(API_PATHS.projects.byId(id), {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    publishUpdate: (id: string, input: PublishUpdateInput) =>
      request<ProjectUpdate>(API_PATHS.projects.updates(id), {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    follow: (id: string) => request<void>(API_PATHS.projects.follow(id), { method: 'POST' }),
    unfollow: (id: string) => request<void>(API_PATHS.projects.follow(id), { method: 'DELETE' }),
  };
}
