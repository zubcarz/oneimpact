import { Injectable } from '@nestjs/common';
import type { Notification as PrismaNotification } from '@prisma/client';
import type { NotificationType } from '@oneimpact/shared';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface UpsertNotificationInput {
  userId: string;
  type: NotificationType;
  /**
   * CRITICAL: never `null`/`undefined` here. See the class doc on
   * `upsertNotification` below for why -- this is the load-bearing invariant
   * of the whole `notifications` module (plan
   * `20260822-api-payments-subscriptions-events.plan.md`, fase 5).
   */
  refId: string;
  title: string;
  body: string;
}

/**
 * Only place in the `notifications` module allowed to touch `PrismaService`.
 * `NotificationsListener` and `NotificationsService` never import Prisma
 * directly.
 *
 * Also reads `ProjectFollow` and `Project` rows straight through Prisma for
 * the `project.update_published` fan-out -- permitted per
 * `30-api-event-driven.md` ("leer sus tablas con Prisma desde infra SI esta
 * permitido; importar sus servicios NO"). This module never injects
 * `FollowsService`/`ProjectsWritesService`.
 */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent upsert on the compound unique `[userId, type, refId]`
   * (`schema.prisma`'s `Notification.@@unique([userId, type, refId])`).
   *
   * `refId` is declared `String?` (nullable) at the COLUMN level in
   * `schema.prisma`, but that is a red herring for this method: Postgres
   * NEVER considers two NULLs equal when evaluating a unique constraint --
   * a unique index simply does not fire on a NULL vs NULL comparison, by
   * design (it is how you can have multiple rows with a NULL in a unique
   * column at all). If a caller ever upserted with `refId: null` (e.g. "the
   * welcome notification has no natural id, so null"), every redelivery of
   * `user.registered` would INSERT a brand new row instead of deduplicating
   * -- the exact idempotency invariant this module exists to guarantee would
   * silently break, and only against real Postgres: an in-memory mock keyed
   * on `JSON.stringify` would never catch it. That is why every call site in
   * `NotificationsListener` resolves a concrete, non-null id to pass as
   * `refId` (`userId` for WELCOME, `subscriptionId` for SUBSCRIPTION,
   * `updateId` for PROJECT_UPDATE) instead of ever passing `null`.
   */
  upsertNotification(input: UpsertNotificationInput): Promise<PrismaNotification> {
    return this.prisma.notification.upsert({
      where: {
        userId_type_refId: {
          userId: input.userId,
          type: input.type,
          refId: input.refId,
        },
      },
      create: input,
      update: {},
    });
  }

  findManyByUser(userId: string): Promise<PrismaNotification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId } });
  }

  /**
   * Marks a notification read, filtering by BOTH `id` AND `userId` in the
   * SAME query (`updateMany`'s `where`) -- never a `findUnique` by `id`
   * alone followed by an in-application `row.userId === userId` check.
   *
   * Filtering only by `id` and comparing ownership afterwards would still be
   * an IDOR in spirit even if the code happens to reject the mismatch: it
   * means the row was already fetched, the check lives in a place someone
   * could "simplify" away later, and a future refactor that returns early
   * before the comparison (or a copy-pasted variant that forgets it) quietly
   * reopens the hole. Baking the ownership filter into the query itself
   * makes "return a row I don't own" structurally impossible, not just
   * disallowed by convention.
   *
   * `updateMany`'s `count` distinguishes "no row matched id+userId" (0) from
   * "matched and updated" (1); `NotificationsService.markRead` treats a
   * non-existent id and someone else's id identically (404
   * `NOTIFICATION_NOT_FOUND` either way), so an attacker probing ids learns
   * nothing from the response.
   */
  async markRead(userId: string, id: string): Promise<PrismaNotification | null> {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (count === 0) {
      return null;
    }
    return this.prisma.notification.findUnique({ where: { id } });
  }

  /**
   * Followers of a project, read straight through `ProjectFollow` --
   * `notifications` resolves this itself instead of calling into
   * `projects`'s `FollowsService` (there is no such export to call anyway:
   * cross-module calls are by event only, `catalog`/`payments` excepted).
   */
  async findFollowerIds(projectId: string): Promise<string[]> {
    const follows = await this.prisma.projectFollow.findMany({
      where: { projectId },
      select: { userId: true },
    });
    return follows.map((follow) => follow.userId);
  }

  findProjectTitle(projectId: string): Promise<{ title: string } | null> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: { title: true },
    });
  }
}
