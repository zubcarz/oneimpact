import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AdminMetrics } from '@oneimpact/shared';
import { Role } from '@oneimpact/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminMetricsService } from '../application/admin-metrics.service';
import { AdminMetricsDto } from './dto/admin-metrics.dto';

/**
 * `@Controller('admin/metrics')` -> mounted under the global `v1` prefix set
 * in `main.ts`, so the real path is `/v1/admin/metrics`.
 *
 * `@Roles(Role.ADMIN)` at the class level: same pattern as
 * `AdminUsersController` (`modules/users/controllers/admin-users.controller.ts`)
 * and `OutboxAdminController` (`infra/events/controllers/outbox-admin.controller.ts`).
 * A `USER` gets 403, not 404.
 *
 * Thin controller: delegates to `AdminMetricsService`, which owns the 30s
 * in-memory cache. Never touches `PrismaService` directly.
 */
@ApiTags('admin')
@Roles(Role.ADMIN)
@Controller('admin/metrics')
export class AdminMetricsController {
  constructor(private readonly metrics: AdminMetricsService) {}

  @Get()
  @ApiOkResponse({ type: AdminMetricsDto })
  get(): Promise<AdminMetrics> {
    return this.metrics.getMetrics();
  }
}
