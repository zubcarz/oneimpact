import { createZodDto } from 'nestjs-zod';
import { projectWithUpdatesSchema } from '@oneimpact/shared';

/**
 * Response DTO for `GET /v1/projects/:id`, generated from the single
 * `@oneimpact/shared` contract (`projectWithUpdatesSchema`). Matches what
 * `ProjectsService.getById` returns (`ProjectWithUpdates`, includes `updates`
 * and `zone`). Never redeclare fields here.
 */
export class ProjectWithUpdatesDto extends createZodDto(projectWithUpdatesSchema) {}
