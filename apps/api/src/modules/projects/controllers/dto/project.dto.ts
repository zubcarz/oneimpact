import { createZodDto } from 'nestjs-zod';
import { listResponseSchema, projectSchema } from '@oneimpact/shared';

/**
 * Response DTOs for `GET /v1/projects`, generated from the single
 * `@oneimpact/shared` contract (`projectSchema`). Never redeclare fields here.
 */
export class ProjectDto extends createZodDto(projectSchema) {}

export class ProjectListDto extends createZodDto(listResponseSchema(projectSchema)) {}
