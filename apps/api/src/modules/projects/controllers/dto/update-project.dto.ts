import { createZodDto } from 'nestjs-zod';
import { updateProjectSchema } from '@oneimpact/shared';

/**
 * Request DTO for `PATCH /v1/projects/:id` (`AdminProjectsController`),
 * generated from the single `@oneimpact/shared` contract
 * (`updateProjectSchema`, `createProjectSchema.partial()`). Never redeclare
 * fields here.
 */
export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}
