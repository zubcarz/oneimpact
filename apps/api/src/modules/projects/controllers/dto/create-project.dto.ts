import { createZodDto } from 'nestjs-zod';
import { createProjectSchema } from '@oneimpact/shared';

/**
 * Request DTO for `POST /v1/projects` (`AdminProjectsController`), generated
 * from the single `@oneimpact/shared` contract (`createProjectSchema`).
 * Never redeclare fields here. `slug` is deliberately absent from the schema
 * (decision D4a): the server derives it from `title`.
 */
export class CreateProjectDto extends createZodDto(createProjectSchema) {}
