import { Test } from '@nestjs/testing';
import type { Plan, SimulatedCard } from '@oneimpact/shared';
import { Billing, PlanId, SubscriptionStatus as SharedSubscriptionStatus } from '@oneimpact/shared';
import type { Subscription as PrismaSubscription } from '@prisma/client';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { EventBus } from '../../../infra/events/event-bus';
import { EventName } from '../../../infra/events/event-names';
import { CatalogService } from '../../catalog/application/catalog.service';
import { PaymentsService } from '../../payments/application/payments.service';
import { SubscriptionsRepository } from '../infrastructure/subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  const PLANS: Plan[] = [
    { id: 'basico', name: 'Basico', monthlyPrice: 5, annualMonthlyPrice: 4, annualTotal: 48 },
    {
      id: 'estandar',
      name: 'Estandar',
      monthlyPrice: 10,
      annualMonthlyPrice: 8,
      annualTotal: 96,
      recommended: true,
    },
    { id: 'premium', name: 'Premium', monthlyPrice: 15, annualMonthlyPrice: 12, annualTotal: 144 },
  ];

  const buildCard = (overrides: Partial<SimulatedCard> = {}): SimulatedCard => ({
    brand: 'visa',
    last4: '4242',
    holder: 'Ana Perez',
    expMonth: 12,
    expYear: 2099,
    ...overrides,
  });

  const buildSubscriptionRow = (
    overrides: Partial<PrismaSubscription> = {},
  ): PrismaSubscription => ({
    id: 'sub-1',
    userId: 'user-1',
    planId: PlanId.ESTANDAR,
    billing: Billing.MONTHLY,
    status: SubscriptionStatus.ACTIVE,
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    canceledAt: null,
    ...overrides,
  });

  const setup = async () => {
    const repository = {
      findActiveByUserId: jest.fn(),
      runTransaction: jest.fn((work: (tx: unknown) => Promise<unknown>) => work({})),
      createActivated: jest.fn(),
      cancel: jest.fn(),
    };
    const payments = { simulate: jest.fn() };
    const catalog = {
      listPlans: jest.fn().mockResolvedValue({ items: PLANS, total: PLANS.length }),
    };
    const eventBus = { publish: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        SubscriptionsRepository,
        PaymentsService,
        CatalogService,
        EventBus,
      ],
    })
      .overrideProvider(SubscriptionsRepository)
      .useValue(repository)
      .overrideProvider(PaymentsService)
      .useValue(payments)
      .overrideProvider(CatalogService)
      .useValue(catalog)
      .overrideProvider(EventBus)
      .useValue(eventBus)
      .compile();

    return {
      service: moduleRef.get(SubscriptionsService),
      repository,
      payments,
      catalog,
      eventBus,
    };
  };

  describe('create', () => {
    it('activates the subscription and publishes subscription.activated on a succeeded payment', async () => {
      const { service, repository, payments, eventBus } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);
      payments.simulate.mockResolvedValue({
        status: PaymentStatus.SUCCEEDED,
        paymentId: 'payment-1',
      });
      repository.createActivated.mockResolvedValue(buildSubscriptionRow());

      const result = await service.create('user-1', {
        planId: PlanId.ESTANDAR,
        billing: Billing.MONTHLY,
        card: buildCard(),
      });

      expect(result.id).toBe('sub-1');
      expect(result.status).toBe(SharedSubscriptionStatus.ACTIVE);
      expect(repository.createActivated).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-1',
          planId: PlanId.ESTANDAR,
          billing: Billing.MONTHLY,
          paymentId: 'payment-1',
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventName.SUBSCRIPTION_ACTIVATED,
          payload: {
            userId: 'user-1',
            subscriptionId: 'sub-1',
            planId: PlanId.ESTANDAR,
            billing: Billing.MONTHLY,
          },
        }),
        expect.anything(),
      );
    });

    it('rejects with 402 and details.reason=CARD_DECLINED, and never creates a subscription, when the card is declined', async () => {
      const { service, repository, payments, eventBus } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);
      payments.simulate.mockResolvedValue({
        status: PaymentStatus.FAILED,
        paymentId: 'payment-2',
        reason: 'CARD_DECLINED',
      });

      await expect(
        service.create('user-1', {
          planId: PlanId.ESTANDAR,
          billing: Billing.MONTHLY,
          card: buildCard(),
        }),
      ).rejects.toMatchObject({
        code: 'PAYMENT_DECLINED',
        status: 402,
        details: { reason: 'CARD_DECLINED' },
      });

      expect(repository.runTransaction).not.toHaveBeenCalled();
      expect(repository.createActivated).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('rejects with 402 and details.reason=CARD_EXPIRED when the card is expired', async () => {
      const { service, repository, payments, eventBus } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);
      payments.simulate.mockResolvedValue({
        status: PaymentStatus.FAILED,
        paymentId: 'payment-3',
        reason: 'CARD_EXPIRED',
      });

      await expect(
        service.create('user-1', {
          planId: PlanId.ESTANDAR,
          billing: Billing.MONTHLY,
          card: buildCard(),
        }),
      ).rejects.toMatchObject({
        code: 'PAYMENT_DECLINED',
        status: 402,
        details: { reason: 'CARD_EXPIRED' },
      });

      expect(repository.runTransaction).not.toHaveBeenCalled();
      expect(repository.createActivated).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('rejects with 409 when the user already has an active subscription', async () => {
      const { service, repository, payments } = await setup();
      repository.findActiveByUserId.mockResolvedValue(buildSubscriptionRow());

      await expect(
        service.create('user-1', {
          planId: PlanId.ESTANDAR,
          billing: Billing.MONTHLY,
          card: buildCard(),
        }),
      ).rejects.toMatchObject({ code: 'SUBSCRIPTION_EXISTS', status: 409 });

      expect(payments.simulate).not.toHaveBeenCalled();
    });

    it('charges the recurring monthly price in cents for monthly billing', async () => {
      const { service, repository, payments } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);
      payments.simulate.mockResolvedValue({
        status: PaymentStatus.SUCCEEDED,
        paymentId: 'payment-1',
      });
      repository.createActivated.mockResolvedValue(buildSubscriptionRow());

      // estandar.monthlyPrice = 10 dollars -> 1000 cents.
      await service.create('user-1', {
        planId: PlanId.ESTANDAR,
        billing: Billing.MONTHLY,
        card: buildCard(),
      });

      expect(payments.simulate).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000 }));
    });

    it('charges the full annual total in cents for annual billing, not annualMonthlyPrice * 12', async () => {
      const { service, repository, payments } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);
      payments.simulate.mockResolvedValue({
        status: PaymentStatus.SUCCEEDED,
        paymentId: 'payment-1',
      });
      repository.createActivated.mockResolvedValue(
        buildSubscriptionRow({ billing: Billing.ANNUAL }),
      );

      // estandar.annualTotal = 96 dollars -> 9600 cents.
      await service.create('user-1', {
        planId: PlanId.ESTANDAR,
        billing: Billing.ANNUAL,
        card: buildCard(),
      });

      expect(payments.simulate).toHaveBeenCalledWith(expect.objectContaining({ amount: 9600 }));
    });

    it('rejects with 404 when the plan does not exist in the catalog', async () => {
      const { service, repository, catalog, payments } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);
      catalog.listPlans.mockResolvedValue({ items: [], total: 0 });

      await expect(
        service.create('user-1', {
          planId: PlanId.ESTANDAR,
          billing: Billing.MONTHLY,
          card: buildCard(),
        }),
      ).rejects.toMatchObject({ code: 'PLAN_NOT_FOUND', status: 404 });

      expect(payments.simulate).not.toHaveBeenCalled();
    });
  });

  describe('getMine', () => {
    it('returns the active subscription', async () => {
      const { service, repository } = await setup();
      repository.findActiveByUserId.mockResolvedValue(buildSubscriptionRow());

      const result = await service.getMine('user-1');

      expect(result.id).toBe('sub-1');
    });

    it('rejects with 404 when there is no active subscription', async () => {
      const { service, repository } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);

      await expect(service.getMine('user-1')).rejects.toMatchObject({
        code: 'SUBSCRIPTION_NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('cancelMine', () => {
    it('cancels the active subscription and publishes subscription.canceled', async () => {
      const { service, repository, eventBus } = await setup();
      repository.findActiveByUserId.mockResolvedValue(buildSubscriptionRow());
      repository.cancel.mockResolvedValue(
        buildSubscriptionRow({
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date('2026-02-01T00:00:00.000Z'),
        }),
      );

      const result = await service.cancelMine('user-1');

      expect(result.status).toBe(SharedSubscriptionStatus.CANCELED);
      expect(repository.cancel).toHaveBeenCalledWith(expect.anything(), 'sub-1');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventName.SUBSCRIPTION_CANCELED,
          payload: { userId: 'user-1', subscriptionId: 'sub-1' },
        }),
        expect.anything(),
      );
    });

    it('rejects with 404 when there is no active subscription to cancel', async () => {
      const { service, repository, eventBus } = await setup();
      repository.findActiveByUserId.mockResolvedValue(null);

      await expect(service.cancelMine('user-1')).rejects.toMatchObject({
        code: 'SUBSCRIPTION_NOT_FOUND',
        status: 404,
      });
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
