import type { Notification as PrismaNotification } from '@prisma/client';
import type { NotificationItem } from '@oneimpact/shared';

/**
 * Prisma -> `@oneimpact/shared` contract mapper for the `notifications`
 * module.
 *
 * Keeps the explicit `: NotificationItem` return type annotation on purpose
 * (see `modules/projects/infrastructure/projects.mapper.ts`): without it,
 * forgetting to map a field would not be caught by the typecheck.
 */
export function toNotification(row: PrismaNotification): NotificationItem {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    refId: row.refId ?? undefined,
    readAt: row.readAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
