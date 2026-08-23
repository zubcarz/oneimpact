import { Injectable } from '@nestjs/common';
import type { ProjectFollow } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

/**
 * Owns `ProjectFollow` reads/writes for `FollowsService`. Kept separate from
 * `ProjectsRepository`: follows are a different aggregate (composite PK
 * `[userId, projectId]`, `schema.prisma`'s `ProjectFollow` model), not a
 * project field, so they get their own repository per the module's
 * "one file, one responsibility" convention.
 */
@Injectable()
export class FollowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async projectExists(projectId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    return project !== null;
  }

  /**
   * Idempotent follow: `upsert` on the composite PK. Calling this twice for
   * the same `[userId, projectId]` leaves exactly one row and never throws a
   * unique constraint violation (unlike a plain `create`).
   */
  upsert(userId: string, projectId: string): Promise<ProjectFollow> {
    return this.prisma.projectFollow.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId },
      update: {},
    });
  }

  /**
   * Idempotent unfollow: `deleteMany` resolves with `{ count: 0 }` instead of
   * throwing when there is no matching row, unlike `delete`.
   */
  async remove(userId: string, projectId: string): Promise<void> {
    await this.prisma.projectFollow.deleteMany({ where: { userId, projectId } });
  }
}
