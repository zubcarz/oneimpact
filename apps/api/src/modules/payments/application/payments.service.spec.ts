import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { SimulatedCard } from '@oneimpact/shared';
import type { Payment } from '@prisma/client';
import { PaymentStatus } from '@prisma/client';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { PaymentsRepository } from '../infrastructure/payments.repository';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const buildCard = (overrides: Partial<SimulatedCard> = {}): SimulatedCard => ({
    brand: 'visa',
    last4: '4242',
    holder: 'Ana Perez',
    expMonth: 12,
    expYear: 2099,
    ...overrides,
  });

  const buildPaymentRow = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'payment-1',
    subscriptionId: null,
    userId: 'user-1',
    amount: 1500,
    currency: 'USD',
    status: PaymentStatus.SUCCEEDED,
    cardBrand: 'visa',
    cardLast4: '4242',
    simulated: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const setup = async () => {
    const repository = { create: jest.fn() };
    const eventBus = { publish: jest.fn() };
    // The simulation delay is only exercised on the approved path; keeping
    // it at 0 here (instead of the real ~800 ms default) is what keeps this
    // whole suite fast.
    const config = { get: jest.fn().mockReturnValue(0) };

    const moduleRef = await Test.createTestingModule({
      providers: [PaymentsService, PaymentsRepository, EventBus, ConfigService],
    })
      .overrideProvider(PaymentsRepository)
      .useValue(repository)
      .overrideProvider(EventBus)
      .useValue(eventBus)
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();

    return {
      service: moduleRef.get(PaymentsService),
      repository,
      eventBus,
    };
  };

  describe('a card ending in 0000', () => {
    it('is declined with reason CARD_DECLINED, still persisted as simulated, and publishes payment.failed', async () => {
      const { service, repository, eventBus } = await setup();
      const card = buildCard({ last4: '0000' });
      repository.create.mockResolvedValue(
        buildPaymentRow({ status: PaymentStatus.FAILED, cardLast4: '0000' }),
      );

      const result = await service.simulate({ userId: 'user-1', amount: 1500, card });

      expect(result).toEqual({
        status: PaymentStatus.FAILED,
        paymentId: 'payment-1',
        reason: 'CARD_DECLINED',
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: 1500,
          status: PaymentStatus.FAILED,
          simulated: true,
          cardBrand: 'visa',
          cardLast4: '0000',
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventName.PAYMENT_FAILED }),
      );
    });
  });

  describe('an expired card', () => {
    it('is declined with reason CARD_EXPIRED when the expiration month has fully elapsed', async () => {
      const { service, repository, eventBus } = await setup();
      const card = buildCard({ expMonth: 1, expYear: 2020 });
      repository.create.mockResolvedValue(buildPaymentRow({ status: PaymentStatus.FAILED }));

      const result = await service.simulate({ userId: 'user-1', amount: 1500, card });

      expect(result).toEqual(
        expect.objectContaining({ status: PaymentStatus.FAILED, reason: 'CARD_EXPIRED' }),
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.FAILED, simulated: true }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventName.PAYMENT_FAILED }),
      );
    });

    it('classic boundary bug: a card expiring THIS calendar month is still valid, not expired', async () => {
      const { service, repository } = await setup();
      const now = new Date();
      // Expires at the end of the CURRENT month: still valid today, per the
      // "compare against the end of the expiration month" rule.
      const card = buildCard({ expMonth: now.getUTCMonth() + 1, expYear: now.getUTCFullYear() });
      repository.create.mockResolvedValue(buildPaymentRow({ status: PaymentStatus.SUCCEEDED }));

      const result = await service.simulate({ userId: 'user-1', amount: 1500, card });

      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('any other card', () => {
    it('is approved, persisted as simulated, and publishes payment.succeeded', async () => {
      const { service, repository, eventBus } = await setup();
      const card = buildCard();
      repository.create.mockResolvedValue(buildPaymentRow());

      const result = await service.simulate({ userId: 'user-1', amount: 1500, card });

      expect(result).toEqual({ status: PaymentStatus.SUCCEEDED, paymentId: 'payment-1' });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          amount: 1500,
          currency: 'USD',
          status: PaymentStatus.SUCCEEDED,
          simulated: true,
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: EventName.PAYMENT_SUCCEEDED }),
      );
    });
  });

  describe('event payloads', () => {
    it('never carry a full card number, on either a succeeded or a failed payment', async () => {
      const { service, repository, eventBus } = await setup();

      repository.create.mockResolvedValue(buildPaymentRow());
      await service.simulate({ userId: 'user-1', amount: 1500, card: buildCard() });

      repository.create.mockResolvedValue(buildPaymentRow({ status: PaymentStatus.FAILED }));
      await service.simulate({
        userId: 'user-1',
        amount: 1500,
        card: buildCard({ last4: '0000' }),
      });

      const forbiddenKeys = ['number', 'pan', 'cvv', 'cardNumber', 'card'];
      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      for (const call of eventBus.publish.mock.calls) {
        const [event] = call as [{ payload: Record<string, unknown> }];
        const payloadKeys = Object.keys(event.payload);
        for (const forbidden of forbiddenKeys) {
          expect(payloadKeys).not.toContain(forbidden);
        }
      }
    });
  });
});
