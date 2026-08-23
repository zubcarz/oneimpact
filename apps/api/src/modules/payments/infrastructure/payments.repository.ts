import { Injectable } from '@nestjs/common';
import type { Payment, PaymentStatus } from '@prisma/client';
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
 * `PaymentsService` (application layer) never imports Prisma directly.
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

  create(input: CreatePaymentInput): Promise<Payment> {
    return this.prisma.payment.create({ data: input });
  }
}
