import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { UserProfile } from '@oneimpact/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { UsersService } from '../application/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';

/**
 * `@Controller('me')` -> mounted under the global `v1` prefix set in
 * `main.ts` (`setGlobalPrefix('v1', ...)`), so the real paths are
 * `/v1/me`. Deliberately NOT `@Public()`: this is the profile of the caller
 * themselves, it requires `JwtAuthGuard` to have populated `request.user`
 * (via `@CurrentUser()`).
 *
 * Both handlers re-read the user from the DB through `UsersService` rather
 * than trusting the JWT claims (`AuthenticatedUser`) as the response: the
 * access token can be up to 15 minutes stale (see `jwt.strategy.ts`), so a
 * name just changed by `PATCH /me` would not show up in `GET /me` if it
 * simply echoed `@CurrentUser()` back.
 */
@ApiTags('users')
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserProfileDto })
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.users.getProfile(user.id);
  }

  @Patch()
  @ApiOkResponse({ type: UserProfileDto })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.users.updateProfile(user.id, body);
  }
}
