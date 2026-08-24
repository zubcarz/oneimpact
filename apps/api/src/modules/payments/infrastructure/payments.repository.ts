import { Injectable } from '@nestjs/common';
import type { Payment, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';

export interface CreatePaymentInput {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  cardBrand: string;
  cardLast4: string;
  simulated: boolean;
}

/**
 * Only place in the `payments` module allowed to touch `PrismaService`.
 * `PaymentsService` (application layer) never imports Prisma directly,
 * except for the `Prisma.TransactionClient` TYPE it threads through
 * `runTransaction` so it can call `EventBus.publish(event, tx)` from inside
 * the SAME transaction that writes the `Payment` row -- same pattern as
 * `SubscriptionsRepository`.
 *
 * `subscriptionId` is intentionally never set here: a payment is simulated
 * BEFORE any `Subscription` row exists, per the comment on
 * `Payment.subscriptionId` in `schema.prisma`. `subscriptions` attaches this
 * payment to the row it creates once `PaymentsService.simulate` returns
 * `SUCCEEDED` -- that update happens in the `subscriptions` module, not here.
 */
@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs `work` inside a single Prisma transaction and returns whatever it
   * resolves to. `PaymentsService` uses this to atomically create the
   * `Payment` row and publish the domain event with that same transaction
   * handle.
   */
  runTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  create(tx: Prisma.TransactionClient, input: CreatePaymentInput): Promise<Payment> {
    return tx.payment.create({ data: input });
  }
}
