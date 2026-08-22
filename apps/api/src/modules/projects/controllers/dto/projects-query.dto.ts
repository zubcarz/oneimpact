import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { zoneSlugSchema, ProjectStatus } from '@oneimpact/shared';

/**
 * Query DTO for `GET /v1/projects`.
 *
 * The spec `02-api-catalog-and-projects.md` documents the filter as
 * `?zone=<slug>`, but `packages/api-client` is already committed to `main`
 * using `zoneSlug` (`packages/api-client/src/resources/projects.ts:18-22`,
 * fixed by `packages/api-client/src/index.test.ts:99-100`). Per repo rule
 * "ante conflicto entre un doc y el codigo, gana el codigo", this DTO uses
 * `zoneSlug`. The spec correction is tracked for the plan's closing phase.
 */
export const projectsQuerySchema = z.object({
  zoneSlug: zoneSlugSchema.optional(),
  status: z.enum([ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED]).optional(),
});

export class ProjectsQueryDto extends createZodDto(projectsQuerySchema) {}
