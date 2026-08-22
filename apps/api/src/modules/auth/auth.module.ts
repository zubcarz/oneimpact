import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './application/auth.service';
import { TokensService } from './application/tokens.service';
import { AuthController } from './controllers/auth.controller';
import { AuthUsersRepository } from './infrastructure/auth-users.repository';
import { RefreshTokenRepository } from './infrastructure/refresh-token.repository';

/**
 * `JwtModule.register({})` on purpose: no global secret/options. Access and
 * refresh tokens are signed and verified with their own secret passed at the
 * call site (`TokensService`), so a token issued for one never verifies
 * against the other's secret by accident.
 *
 * The global guard (`APP_GUARD`), `JwtStrategy` and `@Public()` on the
 * currently-open routes are added together in this plan's next phase --
 * registering the guard here now would 401 the whole API with no `@Public()`
 * anywhere to opt out.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, TokensService, AuthUsersRepository, RefreshTokenRepository],
})
export class AuthModule {}
