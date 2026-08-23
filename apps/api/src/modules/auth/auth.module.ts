import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './application/auth.service';
import { TokensService } from './application/tokens.service';
import { AuthController } from './controllers/auth.controller';
import { AuthUsersRepository } from './infrastructure/auth-users.repository';
import { RefreshTokenRepository } from './infrastructure/refresh-token.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * `JwtModule.register({})` on purpose: no global secret/options. Access and
 * refresh tokens are signed and verified with their own secret passed at the
 * call site (`TokensService`), so a token issued for one never verifies
 * against the other's secret by accident.
 *
 * `JwtAuthGuard` is registered here as `APP_GUARD`, not with
 * `app.useGlobalGuards()` in `main.ts`. `APP_GUARD` is a provider resolved
 * from `AppModule`'s own graph, so any test that builds the app from
 * `AppModule` (`test/utils/create-test-app.ts`) gets the exact same guard
 * production does. Registering it in `main.ts` instead would leave the e2e
 * suite open while production is closed -- the opposite of what this phase
 * is for.
 *
 * `ThrottlerModule` is registered here too (`AUTH_THROTTLE_LIMIT` /
 * `AUTH_THROTTLE_TTL_MS`, see `env.ts`) but is applied with
 * `@UseGuards(ThrottlerGuard)` only on `AuthController`, not as another
 * `APP_GUARD`: a global throttler would also rate-limit the public catalog
 * and projects endpoints, causing intermittent 429s in their e2e suites.
 *
 * `RolesGuard` is registered here too, as the SECOND `APP_GUARD` entry. Nest
 * resolves `APP_GUARD` providers in registration order and runs them in that
 * same order, so it always executes after `JwtAuthGuard`: by the time it
 * reads `request.user.role`, `JwtAuthGuard`/`JwtStrategy` has already either
 * populated it (protected route with a valid token) or short-circuited the
 * request (missing/invalid token, unless `@Public()`). See `roles.guard.ts`
 * for what happens when `request.user` is still missing at that point.
 */
@Module({
  imports: [
    JwtModule.register({}),
    PassportModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('AUTH_THROTTLE_TTL_MS', 60000),
          limit: config.get<number>('AUTH_THROTTLE_LIMIT', 10),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokensService,
    AuthUsersRepository,
    RefreshTokenRepository,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
