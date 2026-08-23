import type { Subscription as PrismaSubscription } from '@prisma/client';
import type { Subscription } from '@oneimpact/shared';

/**
 * Prisma -> `@oneimpact/shared` contract mapper for the `subscriptions`
 * module.
 *
 * Keeps the explicit `: Subscription` return type annotation on purpose (see
 * `modules/projects/infrastructure/projects.mapper.ts`): without it,
 * forgetting to map a field would not be caught by the typecheck.
 */
export function toSubscription(row: PrismaSubscription): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    billing: row.billing,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    canceledAt: row.canceledAt?.toISOString(),
  };
}
