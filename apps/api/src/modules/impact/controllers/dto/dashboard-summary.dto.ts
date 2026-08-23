import { createZodDto } from 'nestjs-zod';
import { dashboardSummarySchema } from '@oneimpact/shared';

/**
 * Response DTO for `GET /v1/dashboard/me`, generated from the single
 * `@oneimpact/shared` contract (`dashboardSummarySchema`). Never redeclare
 * fields here.
 */
export class DashboardSummaryDto extends createZodDto(dashboardSummarySchema) {}
