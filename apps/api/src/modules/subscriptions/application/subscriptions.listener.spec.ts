import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventName } from '../../../infra/events/event-names';
import type {
  PaymentFailedEvent,
  PaymentSucceededEvent,
} from '../../payments/domain/payments.events';
import { SubscriptionsListener } from './subscriptions.listener';

describe('SubscriptionsListener', () => {
  const succeededEvent: PaymentSucceededEvent = {
    type: EventName.PAYMENT_SUCCEEDED,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    payload: { paymentId: 'payment-1', userId: 'user-1', amount: 1000 },
  };

  const failedEvent: PaymentFailedEvent = {
    type: EventName.PAYMENT_FAILED,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    payload: { paymentId: 'payment-2', userId: 'user-1', reason: 'CARD_DECLINED' },
  };

  const setup = async () => {
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [SubscriptionsListener, Logger],
    })
      .overrideProvider(Logger)
      .useValue(logger)
      .compile();

    return {
      listener: moduleRef.get(SubscriptionsListener),
      logger,
    };
  };

  it('logs payment.succeeded with ids only, no card data', async () => {
    const { listener, logger } = await setup();

    listener.handlePaymentSucceeded(succeededEvent);

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [message] = logger.log.mock.calls[0] as [string];
    expect(message).toContain('payment-1');
    expect(message).toContain('user-1');
    expect(message).not.toMatch(/pan|cvv|holder|card(Number)?/i);
  });

  it('logs payment.failed with the reason, no card data', async () => {
    const { listener, logger } = await setup();

    listener.handlePaymentFailed(failedEvent);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [message] = logger.warn.mock.calls[0] as [string];
    expect(message).toContain('payment-2');
    expect(message).toContain('CARD_DECLINED');
    expect(message).not.toMatch(/pan|cvv|holder/i);
  });

  it('never propagates an exception thrown while auditing payment.succeeded', async () => {
    const { listener, logger } = await setup();
    logger.log.mockImplementation(() => {
      throw new Error('log sink unavailable');
    });

    expect(() => listener.handlePaymentSucceeded(succeededEvent)).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('never propagates an exception thrown while auditing payment.failed', async () => {
    const { listener, logger } = await setup();
    logger.warn.mockImplementation(() => {
      throw new Error('log sink unavailable');
    });

    expect(() => listener.handlePaymentFailed(failedEvent)).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
