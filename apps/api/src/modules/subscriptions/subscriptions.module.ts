import { Logger, Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsListener } from './application/subscriptions.listener';
import { SubscriptionsService } from './application/subscriptions.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionsRepository } from './infrastructure/subscriptions.repository';

/**
 * Imports `PaymentsModule` and `CatalogModule`: both are SANCTIONED
 * exceptions to "un modulo no importa servicios de otro modulo"
 * (`30-api-event-driven.md`) -- `catalog` for read-only lookups, `payments`
 * per decision D2a of
 * `.claude/plans/20260822-api-payments-subscriptions-events.plan.md` (full
 * justification on `PaymentsModule`'s class doc). No other domain module is
 * imported here.
 *
 * `Logger` is a plain provider (not exported) so `SubscriptionsListener` can
 * be unit-tested by overriding it.
 */
@Module({
  imports: [PaymentsModule, CatalogModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsListener, SubscriptionsRepository, Logger],
})
export class SubscriptionsModule {}
