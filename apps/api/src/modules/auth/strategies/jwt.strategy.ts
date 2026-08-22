import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserProfile } from '@oneimpact/shared';
import type { AccessTokenPayload } from '../application/tokens.service';

/**
 * What actually lives on `request.user` after a successful JWT check: the
 * three claims the access token carries (`AccessTokenPayload`). Deliberately
 * narrower than `UserProfile` -- the token never carries `name`, so a
 * `UserProfile` typed `request.user` would be a lie about what is available
 * without a DB round trip.
 */
export type AuthenticatedUser = Pick<UserProfile, 'id' | 'email' | 'role'>;

/**
 * Validates the access token bearer and exposes its claims as `request.user`
 * for every guarded route (see `JwtAuthGuard`, `CurrentUser`).
 *
 * `validate()` trusts the claims in the token and never re-reads the user
 * from the database: the role travels inside the access token, signed with
 * `JWT_ACCESS_SECRET`. This means a role change made via
 * `PATCH /admin/users/:id/role` does not take effect for a user who is
 * already holding a valid access token until that token expires (up to 15
 * minutes, `ACCESS_TOKEN_TTL` in `tokens.service.ts`) or is refreshed. That
 * window is an accepted tradeoff for not hitting the DB on every request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    // `payload.role` is typed as `string` in `AccessTokenPayload` (the JWT
    // library signature), but it is only ever signed from `user.role`
    // (`tokens.service.ts#issuePair`), which is the Prisma `Role` enum -- the
    // same domain as `UserProfile['role']`. Trusting that at this boundary
    // (a token this API itself signed and just verified) is the standard
    // tradeoff for decoded JWT claims.
    return { id: payload.sub, email: payload.email, role: payload.role as UserProfile['role'] };
  }
}
