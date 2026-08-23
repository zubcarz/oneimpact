import { createZodDto } from 'nestjs-zod';
import { projectUpdateSchema } from '@oneimpact/shared';

/**
 * Response DTO for `POST /v1/projects/:id/updates` (`AdminProjectsController`),
 * generated from the single `@oneimpact/shared` contract
 * (`projectUpdateSchema`, the same one `projectWithUpdatesSchema.updates`
 * already uses). Never redeclare fields here.
 */
export class ProjectUpdateDto extends createZodDto(projectUpdateSchema) {}
