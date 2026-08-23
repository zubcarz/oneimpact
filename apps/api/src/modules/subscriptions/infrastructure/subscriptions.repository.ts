import { Injectable } from '@nestjs/common';
import type { Subscription as PrismaSubscription } from '@prisma/client';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import type { Billing, PlanId } from '@oneimpact/shared';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface CreateActivatedSubscriptionInput {
  userId: string;
  planId: PlanId;
  billing: Billing;
  /** Id of the already-`SUCCEEDED` `Payment` this subscription is funded by. */
  paymentId: string;
}

/**
 * Only place in the `subscriptions` module allowed to touch `PrismaService`.
 * `SubscriptionsService` never imports Prisma directly, except for the
 * `Prisma.TransactionClient` TYPE it threads through `runTransaction` so it
 * can call `EventBus.publish(event, tx)` from inside the SAME transaction
 * that writes the `Subscription` row -- see `event-bus.ts`'s class doc for
 * why that matters once the outbox (item 12 of the roadmap) lands: that item
 * only needs to change `EventBus.publish`'s body, not this call site.
 */
@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUserId(userId: string): Promise<PrismaSubscription | null> {
    return this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
  }

  /**
   * Runs `work` inside a single Prisma transaction and returns whatever it
   * resolves to. `SubscriptionsService` uses this to atomically create the
   * `Subscription`, attach the `Payment` that funded it, and publish the
   * domain event with that same transaction handle.
   */
  runTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  /**
   * Creates the `ACTIVE` subscription and attaches the given `Payment` to it
   * (`Payment.subscriptionId` starts `null` -- see the migration comment in
   * `schema.prisma` -- because the payment is simulated before any
   * subscription exists).
   */
  async createActivated(
    tx: Prisma.TransactionClient,
    input: CreateActivatedSubscriptionInput,
  ): Promise<PrismaSubscription> {
    const subscription = await tx.subscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        billing: input.billing,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    await tx.payment.update({
      where: { id: input.paymentId },
      data: { subscriptionId: subscription.id },
    });
    return subscription;
  }

  cancel(tx: Prisma.TransactionClient, subscriptionId: string): Promise<PrismaSubscription> {
    return tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
    });
  }
}
