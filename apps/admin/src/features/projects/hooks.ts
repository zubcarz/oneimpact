'use client';

import type { CreateProjectInput, PublishUpdateInput, UpdateProjectInput } from '@oneimpact/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { browserApi } from '@/lib/api-browser';
import { queryKeys } from '@/lib/query-keys';

/**
 * Writes on projects, from the browser.
 *
 * Both mutations go through `browserApi`, so the access token never reaches
 * client-side JavaScript: `/api/gateway` reads the httpOnly cookie and attaches
 * it (decision D1 of the plan). Retries are off for mutations by the provider's
 * default -- creating the same project twice is worse than one visible error.
 *
 * Errors are not swallowed here: the form is the one that has to show a
 * `ZONE_NOT_FOUND` next to the field, so the `ApiError` is left to reach it.
 */

/**
 * Invalidating by the `['projects']` prefix covers the list with every filter
 * combination and the detail of every project in one call, which is what the
 * hierarchical keys are for.
 *
 * It is only half the job, and on purpose: the projects table is a Server
 * Component and does not live in this cache, so the caller also calls
 * `router.refresh()`. This invalidation is what keeps any *client* query from
 * showing a stale project after a save.
 */
function useInvalidateProjects(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
  };
}

export function useCreateProject() {
  const invalidateProjects = useInvalidateProjects();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => browserApi.projects.create(input),
    onSuccess: invalidateProjects,
  });
}

export function useUpdateProject(id: string) {
  const invalidateProjects = useInvalidateProjects();

  return useMutation({
    // `updateProjectSchema` is `.partial()`, so this receives only the fields
    // the admin touched (see `pickDirtyValues` in `./form-utils`).
    mutationFn: (input: UpdateProjectInput) => browserApi.projects.update(id, input),
    onSuccess: invalidateProjects,
  });
}

/**
 * Publishing an update is not only a write on `ProjectUpdate`: the API
 * overwrites `Project.progress` with the progress of the update, inside the same
 * transaction
 * (apps/api/src/modules/projects/application/projects-writes.service.ts:125-130).
 *
 * That is why this invalidates the same `['projects']` prefix as the other two
 * mutations instead of only the updates of this project: the list and the detail
 * are stale the moment an update goes out, and the progress bar of the table has
 * to show the new value. As with the other mutations, the projects table is a
 * Server Component and does not live in this cache, so the caller also calls
 * `router.refresh()`.
 */
export function usePublishUpdate(projectId: string) {
  const invalidateProjects = useInvalidateProjects();

  return useMutation({
    mutationFn: (input: PublishUpdateInput) =>
      browserApi.projects.publishUpdate(projectId, input),
    onSuccess: invalidateProjects,
  });
}
