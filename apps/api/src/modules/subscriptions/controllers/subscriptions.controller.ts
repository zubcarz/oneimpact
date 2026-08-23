import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Subscription } from '@oneimpact/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { SubscriptionsService } from '../application/subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionDto } from './dto/subscription.dto';

/**
 * `@Controller('subscriptions')` -> mounted under the global `v1` prefix set
 * in `main.ts` (`setGlobalPrefix('v1', ...)`), so the real paths are
 * `/v1/subscriptions` and `/v1/subscriptions/me`. Do NOT prefix the
 * decorators with `/v1`.
 *
 * Deliberately NOT `@Public()`: all three handlers act on the caller's own
 * subscription. `JwtAuthGuard` is global (`APP_GUARD` in `auth.module.ts`),
 * so a request without a valid access token gets 401 before reaching this
 * controller.
 *
 * Thin controller: delegates to `SubscriptionsService`, never touches
 * `PrismaService` directly.
 */
@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @ApiCreatedResponse({ type: SubscriptionDto })
  @ApiResponse({
    status: 402,
    description:
      'El pago simulado fue rechazado (`PAYMENT_DECLINED`). El body incluye ' +
      '`details.reason` (`CARD_DECLINED` o `CARD_EXPIRED`).',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya tiene una suscripcion activa (`SUBSCRIPTION_EXISTS`).',
  })
  create(
    @Body() body: CreateSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Subscription> {
    return this.subscriptions.create(user.id, body);
  }

  @Get('me')
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiResponse({
    status: 404,
    description: 'El usuario no tiene una suscripcion activa (`SUBSCRIPTION_NOT_FOUND`).',
  })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<Subscription> {
    return this.subscriptions.getMine(user.id);
  }

  @Delete('me')
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiResponse({
    status: 404,
    description: 'El usuario no tiene una suscripcion activa (`SUBSCRIPTION_NOT_FOUND`).',
  })
  cancelMine(@CurrentUser() user: AuthenticatedUser): Promise<Subscription> {
    return this.subscriptions.cancelMine(user.id);
  }
}
