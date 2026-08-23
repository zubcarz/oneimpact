import { createZodDto } from 'nestjs-zod';
import { listResponseSchema, notificationSchema } from '@oneimpact/shared';

/**
 * Response DTOs for `GET /v1/notifications/me` and
 * `PATCH /v1/notifications/:id/read`, generated from the single
 * `@oneimpact/shared` contract (`notificationSchema`). Never redeclare
 * fields here.
 */
export class NotificationDto extends createZodDto(notificationSchema) {}

export class NotificationsListDto extends createZodDto(listResponseSchema(notificationSchema)) {}
