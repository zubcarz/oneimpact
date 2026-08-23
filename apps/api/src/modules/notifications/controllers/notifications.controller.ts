import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { NotificationItem } from '@oneimpact/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { NotificationsList } from '../application/notifications.service';
import { NotificationsService } from '../application/notifications.service';
import { NotificationDto, NotificationsListDto } from './dto/notification.dto';

/**
 * `@Controller('notifications')` -> mounted under the global `v1` prefix set
 * in `main.ts` (`setGlobalPrefix('v1', ...)`), so the real paths are
 * `/v1/notifications/me` and `/v1/notifications/:id/read`. Do NOT prefix the
 * decorators with `/v1`.
 *
 * Deliberately NOT `@Public()` and no `@Roles`: any authenticated user reads
 * and marks only their OWN notifications -- `JwtAuthGuard` (global) rejects
 * an unauthenticated request with 401, and ownership for `markRead` is
 * enforced inside `NotificationsService`/`NotificationsRepository`, not by a
 * role.
 *
 * Thin controller: delegates to `NotificationsService`, never touches
 * `PrismaService` directly.
 */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me')
  @ApiOkResponse({ type: NotificationsListDto })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<NotificationsList> {
    return this.notifications.listMine(user.id);
  }

  @Patch(':id/read')
  @ApiOkResponse({ type: NotificationDto })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<NotificationItem> {
    return this.notifications.markRead(user.id, id);
  }
}
