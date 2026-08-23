import { Injectable } from '@nestjs/common';
import type { DashboardSummary, Plan } from '@oneimpact/shared';
import type { ProjectUpdate as PrismaProjectUpdate } from '@prisma/client';
import { DomainError } from '../../../common/errors/domain-error';
import { CatalogService } from '../../catalog/application/catalog.service';
import { ImpactRepository } from '../infrastructure/impact.repository';

/**
 * Assembles `GET /v1/dashboard/me`'s response. Injects `CatalogService`
 * directly: a SANCTIONED exception to "un modulo no importa servicios de otro
 * modulo" (`30-api-event-driven.md`), used only to resolve the subscription's
 * `Plan`. Every other read (`Subscription`, `ProjectFollow`, `ProjectUpdate`,
 * `Notification`) goes through `ImpactRepository`, this module's own Prisma
 * boundary -- never `SubscriptionsService`/`FollowsService`/`NotificationsService`.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: ImpactRepository,
    private readonly catalog: CatalogService,
  ) {}

  /**
   * The dashboard exists even for a user who never subscribed (or who
   * canceled): this always resolves 200, never a 404 -- unlike
   * `GET /v1/subscriptions/me`, which 404s on purpose because there the
   * absence of an active subscription IS the error.
   *
   * Two groups of fields, two different lifetimes:
   *
   * - Subscription-derived (`plan`, `billing`, `status`, `activeMonths`):
   *   only meaningful while there IS an ACTIVE subscription. Without one
   *   there is no plan/billing/status to report and no active period to
   *   count, so these go `null`/`0`.
   * - User facts (`journeyPoints`, `followedProjects`,
   *   `unreadNotifications`, `latestUpdate`): computed unconditionally,
   *   subscription or not. Journey points in particular are the user's
   *   permanent record of impact -- they mark months the user actually
   *   supported a cause, and canceling a subscription does not retroactively
   *   erase that history. This is the literal acceptance criterion in
   *   `06-api-payments-subscriptions-events.md` ("Cancelar -> CANCELED;
   *   journey point sigue"): a canceled user keeps seeing their points,
   *   follows and notifications on the dashboard.
   */
  async getSummary(userId: string): Promise<DashboardSummary> {
    const [subscription, followedProjects, journeyPoints, unreadNotifications, latestUpdate] =
      await Promise.all([
        this.repository.findActiveSubscription(userId),
        this.repository.countFollowedProjects(userId),
        this.repository.countJourneyPoints(userId),
        this.repository.countUnreadNotifications(userId),
        this.repository.findLatestUpdateForFollowedProjects(userId),
      ]);

    if (!subscription) {
      return {
        plan: null,
        billing: null,
        status: null,
        activeMonths: 0,
        followedProjects,
        latestUpdate: latestUpdate ? this.toProjectUpdate(latestUpdate) : undefined,
        journeyPoints,
        unreadNotifications,
      };
    }

    const plan = await this.resolvePlan(subscription.planId);

    return {
      plan,
      billing: subscription.billing,
      status: subscription.status,
      activeMonths: this.activeMonthsSince(subscription.startedAt),
      followedProjects,
      latestUpdate: latestUpdate ? this.toProjectUpdate(latestUpdate) : undefined,
      journeyPoints,
      unreadNotifications,
    };
  }

  /**
   * `CatalogService` has no `getPlanById` -- `listPlans` always returns the
   * same small, fixed set of rows (`packages/shared/src/plans.ts`), so
   * filtering in memory here avoids adding a new method to a module this
   * task is not scoped to touch. Same approach as
   * `SubscriptionsService.findPlan`.
   */
  private async resolvePlan(planId: string): Promise<Plan> {
    const { items } = await this.catalog.listPlans();
    const plan = items.find((item) => item.id === planId);
    if (!plan) {
      throw DomainError.notFound('PLAN_NOT_FOUND', `El plan "${planId}" no existe.`);
    }
    return plan;
  }

  /**
   * Whole ("complete") months since `startedAt`, computed as a calendar diff
   * (`year*12 + month`) floored down by one whenever `now`'s day-of-month
   * has not yet reached `startedAt`'s -- i.e. a floor, never a round. A
   * subscription started a month and a half ago (e.g. Jul 1 -> Aug 16)
   * reports `1`, not `2` and not `1.5`: "meses completos" means only fully
   * elapsed months count.
   */
  private activeMonthsSince(startedAt: Date, now: Date = new Date()): number {
    let months =
      (now.getUTCFullYear() - startedAt.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - startedAt.getUTCMonth());
    if (now.getUTCDate() < startedAt.getUTCDate()) {
      months -= 1;
    }
    return Math.max(0, months);
  }

  private toProjectUpdate(row: PrismaProjectUpdate): NonNullable<DashboardSummary['latestUpdate']> {
    return {
      id: row.id,
      projectId: row.projectId,
      title: row.title,
      body: row.body,
      progress: row.progress,
      mediaKey: row.mediaKey ?? undefined,
      publishedAt: row.publishedAt.toISOString(),
      authorId: row.authorId ?? undefined,
    };
  }
}
