import { createZodDto } from 'nestjs-zod';
import { listResponseSchema, zoneSchema } from '@oneimpact/shared';

/**
 * Response DTOs for `GET /v1/zones`, generated from the single
 * `@oneimpact/shared` contract (`zoneSchema`). Never redeclare fields here.
 */
export class ZoneDto extends createZodDto(zoneSchema) {}

export class ZoneListDto extends createZodDto(listResponseSchema(zoneSchema)) {}
