import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthResponse, AuthTokens } from '@oneimpact/shared';
import { AuthService } from '../application/auth.service';
import { AuthResponseDto, AuthTokensDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * `@Controller('auth')` -> mounted under the global `v1` prefix set in
 * `main.ts` (`setGlobalPrefix('v1', ...)`), so the real paths are
 * `/v1/auth/*`. See the same note on `plans.controller.ts`.
 *
 * No `@Public()` here yet: the global `JwtAuthGuard` does not exist until
 * this plan's guard phase, so today every route in the app -- including
 * these -- is already open. Applying `@Public()` before the guard exists
 * would be a no-op; it lands together with the guard so both are reviewed as
 * one change.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() body: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthTokensDto })
  refresh(@Body() body: RefreshDto): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOkResponse()
  async logout(@Body() body: RefreshDto): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}
