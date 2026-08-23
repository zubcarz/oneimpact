import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { DashboardSummary } from '@oneimpact/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { DashboardService } from '../application/dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

/**
 * `@Controller('dashboard')` -> mounted under the global `v1` prefix set in
 * `main.ts` (`setGlobalPrefix('v1', ...)`), so the real path is
 * `/v1/dashboard/me`. Do NOT prefix the decorator with `/v1`.
 *
 * Deliberately NOT `@Public()`: the summary is always about the caller's own
 * account, so `JwtAuthGuard` (global, `APP_GUARD` in `auth.module.ts`) must
 * reject an unauthenticated request with 401 before reaching this handler.
 * No `@Roles` either -- any authenticated user, subscribed or not, can read
 * their own dashboard (see `DashboardService.getSummary`'s doc on the
 * no-subscription case).
 *
 * Thin controller: delegates to `DashboardService`, never touches
 * `PrismaService` directly.
 */
@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('me')
  @ApiOkResponse({ type: DashboardSummaryDto })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<DashboardSummary> {
    return this.dashboard.getSummary(user.id);
  }
}
