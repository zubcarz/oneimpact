import { Injectable } from '@nestjs/common';
import type {
  PlanId as SharedPlanId,
  ProjectStatus as SharedProjectStatus,
} from '@oneimpact/shared';
import type { Billing, Plan, PlanId } from '@prisma/client';
import { ProjectStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface ActiveSubscriptionPlan {
  billing: Billing;
  plan: Plan;
}

export interface ZoneProgress {
  zoneId: string;
  zoneSlug: string;
  zoneName: string;
  avgProgress: number;
}

/**
 * Only place in `impact` allowed to touch `PrismaService` for admin-wide
 * aggregates. Deliberately separate from `ImpactRepository`, which answers
 * "dashboard of ONE user" -- this repository answers "aggregates over ALL
 * users/subscriptions/projects", a different read shape and a different
 * caller (`AdminMetricsService`, cached, admin-only).
 *
 * `countActiveSubscriptionsByPlan`/`countProjectsByStatus` both fill in `0`
 * for every enum member `groupBy` did not return a row for. Without that
 * fill, a plan with zero active subscriptions (or a project status with zero
 * projects) would be MISSING from the response object entirely instead of
 * present with `0` -- which breaks the "conteos coherentes" acceptance
 * criterion from the roadmap spec: a client reading
 * `activeSubscriptionsByPlan.premium` should always get a number, never
 * `undefined`.
 */
@Injectable()
export class AdminMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  async countActiveSubscriptionsByPlan(): Promise<Record<SharedPlanId, number>> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['planId'],
      where: { status: SubscriptionStatus.ACTIVE },
      _count: true,
    });
    return this.fillZeros<PlanId, SharedPlanId>(
      ['basico', 'estandar', 'premium'] as PlanId[],
      rows.map((row) => ({ key: row.planId, count: row._count })),
    );
  }

  /**
   * Feeds `mrrSimulated` (decision D5 of the plan): the caller multiplies
   * `monthlyPriceFor(plan, billing)` for each row, in cents.
   */
  listActiveSubscriptionsWithPlan(): Promise<ActiveSubscriptionPlan[]> {
    return this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });
  }

  async countProjectsByStatus(): Promise<Record<SharedProjectStatus, number>> {
    const rows = await this.prisma.project.groupBy({
      by: ['status'],
      _count: true,
    });
    return this.fillZeros<ProjectStatus, SharedProjectStatus>(
      [ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED],
      rows.map((row) => ({ key: row.status, count: row._count })),
    );
  }

  countUpdatesSince(date: Date): Promise<number> {
    return this.prisma.projectUpdate.count({ where: { publishedAt: { gte: date } } });
  }

  /**
   * On-read average progress per zone (decision D4): no listener, no
   * aggregate table. A zone with no projects reports `avgProgress: 0`
   * instead of `NaN`/division by zero.
   */
  async avgProgressByZone(): Promise<ZoneProgress[]> {
    const zones = await this.prisma.zone.findMany({
      select: { id: true, slug: true, name: true, projects: { select: { progress: true } } },
    });
    return zones.map((zone) => ({
      zoneId: zone.id,
      zoneSlug: zone.slug,
      zoneName: zone.name,
      avgProgress: zone.projects.length
        ? Math.round(
            zone.projects.reduce((sum, project) => sum + project.progress, 0) /
              zone.projects.length,
          )
        : 0,
    }));
  }

  private fillZeros<K extends string, Out extends string>(
    allKeys: K[],
    counted: Array<{ key: K; count: number }>,
  ): Record<Out, number> {
    const result = Object.fromEntries(allKeys.map((key) => [key, 0])) as Record<Out, number>;
    for (const { key, count } of counted) {
      result[key as unknown as Out] = count;
    }
    return result;
  }
}
