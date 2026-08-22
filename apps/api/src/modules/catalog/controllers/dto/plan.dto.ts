import { createZodDto } from 'nestjs-zod';
import { listResponseSchema, planSchema } from '@oneimpact/shared';

/**
 * Response DTOs for `GET /v1/plans`, generated from the single
 * `@oneimpact/shared` contract (`planSchema`). Never redeclare fields here.
 */
export class PlanDto extends createZodDto(planSchema) {}

export class PlanListDto extends createZodDto(listResponseSchema(planSchema)) {}
