import { PLANS, SubscriptionStatus, monthlyPriceFor } from '@oneimpact/shared';
import type { DashboardSummary, ProjectUpdate } from '@oneimpact/shared';
import type { AdminMetrics } from '@oneimpact/api-client';
import { seedProjectUpdatesFixture, seedProjectsFixture } from './seed-fixtures';
import {
  SimulatedError,
  findSubscription,
  getFollowedProjectIds,
  getJourneyPoints,
  getUnreadNotificationsCount,
  listActiveSubscriptions,
  listUsers,
} from './state';

/**
 * Pure, stateless views derived from `state.ts` + the seed fixtures, for the
 * two endpoints that aggregate data `state.ts` itself has no reason to know
 * about (`GET /v1/dashboard/me`, `GET /v1/admin/metrics`). This module owns
 * no mutable state of its own -- it only reads through `state.ts`'s exported
 * accessors -- so `resetSimulatedState()` (in `state.ts`) is still the single
 * reset point for every test: there is nothing extra to reset here.
 */

/**
 * Same "floor, never round" calendar-months formula as
 * `apps/api/src/modules/impact/application/dashboard.service.ts#activeMonthsSince`.
 */
function activeMonthsSince(startedAt: Date, now: Date = new Date()): number {
  let months =
    (now.getUTCFullYear() - startedAt.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - startedAt.getUTCMonth());
  if (now.getUTCDate() < startedAt.getUTCDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

/** Most recent update across every project `userId` follows, or none. */
function resolveLatestUpdate(followedProjectIds: string[]): ProjectUpdate | undefined {
  const candidates = seedProjectUpdatesFixture.filter((update) =>
    followedProjectIds.includes(update.projectId),
  );
  if (candidates.length === 0) return undefined;
  return [...candidates].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )[0];
}

/**
 * Mirrors `DashboardService.getSummary`: always resolves (never 404, unlike
 * `GET /v1/subscriptions/me`), subscription-derived fields go null/0 only
 * when the user never subscribed at all -- an ACTIVE or CANCELED
 * subscription both resolve a plan (a CANCELED one caps `activeMonths` at
 * `canceledAt` instead of "now"). User-facts fields (`journeyPoints`,
 * `followedProjects`, `followedProjectIds`, `unreadNotifications`,
 * `latestUpdate`) are computed unconditionally.
 */
export function getDashboardSummary(userId: string): DashboardSummary {
  const subscription = findSubscription(userId);
  const followedProjectIds = getFollowedProjectIds(userId);
  const shared = {
    followedProjects: followedProjectIds.length,
    followedProjectIds,
    latestUpdate: resolveLatestUpdate(followedProjectIds),
    journeyPoints: getJourneyPoints(userId),
    unreadNotifications: getUnreadNotificationsCount(userId),
  };

  if (!subscription) {
    return { plan: null, billing: null, status: null, activeMonths: 0, ...shared };
  }

  const plan = PLANS.find((item) => item.id === subscription.planId);
  if (!plan) {
    throw new SimulatedError(404, 'PLAN_NOT_FOUND', `El plan "${subscription.planId}" no existe.`);
  }

  const activeMonthsUntil =
    subscription.status === SubscriptionStatus.CANCELED && subscription.canceledAt
      ? new Date(subscription.canceledAt)
      : new Date();

  return {
    plan,
    billing: subscription.billing,
    status: subscription.status,
    activeMonths: activeMonthsSince(new Date(subscription.startedAt), activeMonthsUntil),
    ...shared,
  };
}

/**
 * Not part of the shared REST contract yet (see `AdminMetrics`'s own doc in
 * `packages/api-client/src/resources/admin.ts`): the API does not serve
 * `GET /v1/admin/metrics` at the time of this phase. Shape kept aligned with
 * that client-declared type, since it is the only source of truth for it.
 */
export function getAdminMetrics(): AdminMetrics {
  const activeSubscriptions: Record<string, number> = {};
  let simulatedMrr = 0;
  for (const subscription of listActiveSubscriptions()) {
    activeSubscriptions[subscription.planId] = (activeSubscriptions[subscription.planId] ?? 0) + 1;
    const plan = PLANS.find((item) => item.id === subscription.planId);
    if (plan) {
      simulatedMrr += monthlyPriceFor(plan, subscription.billing);
    }
  }

  const projectsByStatus: Record<string, number> = {};
  for (const project of seedProjectsFixture) {
    projectsByStatus[project.status] = (projectsByStatus[project.status] ?? 0) + 1;
  }

  return {
    users: listUsers().length,
    activeSubscriptions,
    simulatedMrr,
    projectsByStatus,
  };
}
