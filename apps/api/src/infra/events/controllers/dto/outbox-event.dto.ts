import { createZodDto } from 'nestjs-zod';
import { outboxEventSchema } from '@oneimpact/shared';

/**
 * Response DTO for `GET /v1/admin/outbox`, generated from the single
 * `@oneimpact/shared` contract (`outboxEventSchema`). Never redeclare fields
 * here.
 */
export class OutboxEventDto extends createZodDto(outboxEventSchema) {}
