import { createZodDto } from 'nestjs-zod';
import { publishUpdateSchema } from '@oneimpact/shared';

/**
 * Request DTO for `POST /v1/projects/:id/updates` (`AdminProjectsController`),
 * generated from the single `@oneimpact/shared` contract
 * (`publishUpdateSchema`). Never redeclare fields here. `mediaUrl` is stored
 * verbatim as `ProjectUpdate.mediaKey` by `ProjectsWritesService` (decision
 * D5a) -- not a naming bug.
 */
export class PublishUpdateDto extends createZodDto(publishUpdateSchema) {}
