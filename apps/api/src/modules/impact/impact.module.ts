import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ImpactListener } from './application/impact.listener';
import { DashboardService } from './application/dashboard.service';
import { ImpactRepository } from './infrastructure/impact.repository';
import { DashboardController } from './controllers/dashboard.controller';

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
 */
@Module({
  imports: [CatalogModule],
  controllers: [DashboardController],
  providers: [ImpactListener, DashboardService, ImpactRepository],
})
export class ImpactModule {}
