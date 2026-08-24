import { Injectable } from '@nestjs/common';
import type { JourneyPoint, ProjectUpdate, Subscription } from '@prisma/client';
import { JourneySource } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface UpsertJourneyPointInput {
  userId: string;
  month: string;
  source: JourneySource;
  refId: string;
}

/**
 * Only place in the `impact` module allowed to touch `PrismaService`.
 * `ImpactListener` and `DashboardService` never import Prisma directly.
 *
 * Reads `Subscription`, `ProjectFollow`, `ProjectUpdate` and `Notification`
 * rows straight through Prisma -- permitted per `30-api-event-driven.md`
 * ("leer sus tablas con Prisma desde infra SI esta permitido; importar sus
 * servicios NO"). This module never injects `SubscriptionsService`,
 * `FollowsService`/`ProjectsWritesService` or `NotificationsService`.
 */
@Injectable()
export class ImpactRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent upsert on the REAL natural key Prisma generated from
   * `schema.prisma`'s `@@unique([userId, month, source])` on `JourneyPoint`:
   * the compound unique input is `userId_month_source` (fields joined in
   * declaration order), NOT `userId_month` as an earlier draft of the spec
   * assumed (see plan hallazgo 4). Delivering `subscription.activated` twice
   * for the same `[userId, month, source]` must leave exactly one row --
   * `update: {}` on an existing match is a no-op, so it does.
   */
  upsertJourneyPoint(input: UpsertJourneyPointInput): Promise<JourneyPoint> {
    return this.prisma.journeyPoint.upsert({
      where: {
        userId_month_source: {
          userId: input.userId,
          month: input.month,
          source: input.source,
        },
      },
      create: input,
      update: {},
    });
  }

  countJourneyPoints(userId: string): Promise<number> {
    return this.prisma.journeyPoint.count({ where: { userId } });
  }

  /**
   * Most recent subscription regardless of status: the dashboard must keep
   * resolving `plan`/`billing`/`status` for a user whose subscription was
   * canceled instead of falling into the "never subscribed" branch.
   */
  findLatestSubscription(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async listFollowedProjectIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.projectFollow.findMany({
      where: { userId },
      select: { projectId: true },
    });
    return rows.map((row) => row.projectId);
  }

  /**
   * Most recent `ProjectUpdate` among the projects the user follows.
   * Filtered through the `Project.follows` relation (`some: { userId }`)
   * instead of joining `ProjectFollow` -> `Project` -> `ProjectUpdate` by
   * hand: Prisma resolves the nested `some` filter in a single query.
   */
  findLatestUpdateForFollowedProjects(userId: string): Promise<ProjectUpdate | null> {
    return this.prisma.projectUpdate.findFirst({
      where: { project: { follows: { some: { userId } } } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  countUnreadNotifications(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
}
