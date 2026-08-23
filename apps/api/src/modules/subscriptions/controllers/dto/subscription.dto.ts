import { createZodDto } from 'nestjs-zod';
import { subscriptionSchema } from '@oneimpact/shared';

/**
 * Response DTO for `POST /v1/subscriptions`, `GET /v1/subscriptions/me` and
 * `DELETE /v1/subscriptions/me`, generated from the single `@oneimpact/shared`
 * contract (`subscriptionSchema`). Never redeclare fields here.
 */
export class SubscriptionDto extends createZodDto(subscriptionSchema) {}
