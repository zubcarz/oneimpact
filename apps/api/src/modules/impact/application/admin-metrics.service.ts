import { Injectable } from '@nestjs/common';
import type { AdminMetrics } from '@oneimpact/shared';
import { monthlyPriceFor } from '@oneimpact/shared';
import { AdminMetricsRepository } from '../infrastructure/admin-metrics.repository';

const CACHE_MS = 30_000;
const UPDATES_WINDOW_DAYS = 30;
const CENTS_PER_UNIT = 100;

interface MetricsCache {
  data: AdminMetrics;
  expiresAt: number;
}

/**
 * Assembles `GET /v1/admin/metrics`, cached in memory for `CACHE_MS` (30s).
 * `AdminMetricsRepository` is queried by NestJS as a singleton provider, so
 * `this.cache` naturally persists across requests within the same process --
 * no external cache store needed for this scope.
 */
@Injectable()
export class AdminMetricsService {
  private cache: MetricsCache | null = null;

  constructor(private readonly repository: AdminMetricsRepository) {}

  async getMetrics(): Promise<AdminMetrics> {
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.data;
    }
    const data = await this.compute();
    this.cache = { data, expiresAt: Date.now() + CACHE_MS };
    return data;
  }

  private async compute(): Promise<AdminMetrics> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - UPDATES_WINDOW_DAYS);

    const [
      users,
      activeSubscriptionsByPlan,
      activeSubscriptionsWithPlan,
      projectsByStatus,
      updatesLast30Days,
      avgProgressByZone,
    ] = await Promise.all([
      this.repository.countUsers(),
      this.repository.countActiveSubscriptionsByPlan(),
      this.repository.listActiveSubscriptionsWithPlan(),
      this.repository.countProjectsByStatus(),
      this.repository.countUpdatesSince(since),
      this.repository.avgProgressByZone(),
    ]);

    const mrrSimulated = activeSubscriptionsWithPlan.reduce(
      (sum, subscription) =>
        sum + monthlyPriceFor(subscription.plan, subscription.billing) * CENTS_PER_UNIT,
      0,
    );

    return {
      users,
      activeSubscriptionsByPlan,
      mrrSimulated,
      projectsByStatus,
      updatesLast30Days,
      avgProgressByZone,
      generatedAt: new Date().toISOString(),
    };
  }
}
