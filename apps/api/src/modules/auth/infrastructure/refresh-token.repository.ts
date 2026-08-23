import { Injectable } from '@nestjs/common';
import type { RefreshToken } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
}

/**
 * `RefreshToken` never stores the token itself, only its argon2 hash
 * (`tokenHash`, see `schema.prisma`). Because of that a lookup cannot go by
 * "find the row with this token" -- the caller (`AuthService.refresh` /
 * `.logout`) fetches the candidates for a `userId` and compares the hash
 * with `TokensService.verifyTokenHash`.
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data: input });
  }

  /** Not revoked and not expired: the tokens a user could still present. */
  findActiveByUser(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  /** Includes revoked/expired rows, needed to detect reuse of a rotated token. */
  findAnyByUser(userId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({ where: { userId } });
  }

  revoke(id: string, replacedById?: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedById },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
