import { Module } from '@nestjs/common';
import { CatalogService } from './application/catalog.service';
import { CatalogRepository } from './infrastructure/catalog.repository';
import { PlansController } from './controllers/plans.controller';
import { ZonesController } from './controllers/zones.controller';

/**
 * Read-only catalog module (plans, zones). `CatalogService` is exported on
 * purpose: it is the single exception the domain rules allow for a module to
 * be injected directly into other modules, instead of talking over events.
 *
 * Exposes `GET /v1/plans`, `GET /v1/zones` and `GET /v1/zones/:slug` (see the
 * controllers for the `setGlobalPrefix('v1', ...)` note on route paths).
 */
@Module({
  controllers: [PlansController, ZonesController],
  providers: [CatalogRepository, CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
