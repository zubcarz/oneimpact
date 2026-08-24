import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ImpactListener } from './application/impact.listener';
import { DashboardService } from './application/dashboard.service';
import { AdminMetricsService } from './application/admin-metrics.service';
import { ImpactRepository } from './infrastructure/impact.repository';
import { AdminMetricsRepository } from './infrastructure/admin-metrics.repository';
import { DashboardController } from './controllers/dashboard.controller';
import { AdminMetricsController } from './controllers/admin-metrics.controller';

/**
 * Imports `CatalogModule`: a SANCTIONED exception to "un modulo no importa
 * servicios de otro modulo" (`30-api-event-driven.md`), used only to resolve
 * the subscription's `Plan` for the dashboard summary. No other domain
 * module is imported here -- `Subscription`, `ProjectFollow`,
 * `ProjectUpdate` and `Notification` rows are read directly with Prisma by
 * `ImpactRepository` (infra, permitted), never through
 * `subscriptions`/`projects`/`notifications` services.
 *
 * `ImpactListener` reacts to `subscription.activated`/`subscription.canceled`
 * purely by event: `subscriptions` never imports anything from this module.
 *
 * `AdminMetricsRepository`/`AdminMetricsService`/`AdminMetricsController`
 * back `GET /v1/admin/metrics`. Deliberately separate providers from
 * `ImpactRepository`/`DashboardService`: one user's dashboard vs. aggregates
 * over everyone -- see `admin-metrics.repository.ts`'s class doc.
 */
@Module({
  imports: [CatalogModule],
  controllers: [DashboardController, AdminMetricsController],
  providers: [
    ImpactListener,
    DashboardService,
    ImpactRepository,
    AdminMetricsRepository,
    AdminMetricsService,
  ],
})
export class ImpactModule {}
