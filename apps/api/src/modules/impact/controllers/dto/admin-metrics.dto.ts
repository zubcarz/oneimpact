import { createZodDto } from 'nestjs-zod';
import { adminMetricsSchema } from '@oneimpact/shared';

/**
 * Response DTO for `GET /v1/admin/metrics`, generated from the single
 * `@oneimpact/shared` contract (`adminMetricsSchema`). Never redeclare
 * fields here.
 */
export class AdminMetricsDto extends createZodDto(adminMetricsSchema) {}
