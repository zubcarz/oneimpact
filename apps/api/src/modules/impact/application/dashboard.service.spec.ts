import type { Plan } from '@oneimpact/shared';
import { Billing, PlanId, SubscriptionStatus } from '@oneimpact/shared';
import type {
  ProjectUpdate as PrismaProjectUpdate,
  Subscription as PrismaSubscription,
} from '@prisma/client';
import { CatalogService } from '../../catalog/application/catalog.service';
import { ImpactRepository } from '../infrastructure/impact.repository';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const buildPlan = (overrides: Partial<Plan> = {}): Plan => ({
    id: PlanId.BASICO,
    name: 'Basico',
    monthlyPrice: 10,
    annualMonthlyPrice: 8,
    annualTotal: 96,
    recommended: false,
    ...overrides,
  });

  const buildSubscription = (overrides: Partial<PrismaSubscription> = {}): PrismaSubscription => ({
    id: 'sub-1',
    userId: 'user-1',
    planId: PlanId.BASICO,
    billing: Billing.MONTHLY,
    status: SubscriptionStatus.ACTIVE,
    startedAt: new Date('2026-07-01T00:00:00.000Z'),
    canceledAt: null,
    ...overrides,
  });

  interface RepositoryOverrides {
    subscription?: PrismaSubscription | null;
    followedProjects?: number;
    journeyPoints?: number;
    unreadNotifications?: number;
    latestUpdate?: PrismaProjectUpdate | null;
  }

  const setup = (overrides: RepositoryOverrides = {}) => {
    const repository = {
      findActiveSubscription: jest.fn().mockResolvedValue(overrides.subscription ?? null),
      countFollowedProjects: jest.fn().mockResolvedValue(overrides.followedProjects ?? 0),
      countJourneyPoints: jest.fn().mockResolvedValue(overrides.journeyPoints ?? 0),
      countUnreadNotifications: jest.fn().mockResolvedValue(overrides.unreadNotifications ?? 0),
      findLatestUpdateForFollowedProjects: jest
        .fn()
        .mockResolvedValue(overrides.latestUpdate ?? null),
    };
    const catalog = {
      listPlans: jest.fn().mockResolvedValue({ items: [buildPlan()], total: 1 }),
    };
    const service = new DashboardService(
      repository as unknown as ImpactRepository,
      catalog as unknown as CatalogService,
    );
    return { service, repository, catalog };
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 200 with plan/billing/status null but real journeyPoints/followedProjects/unreadNotifications when there is no active subscription', async () => {
    const { service } = setup({
      subscription: null,
      journeyPoints: 4,
      followedProjects: 2,
      unreadNotifications: 3,
    });

    const summary = await service.getSummary('user-1');

    expect(summary).toEqual({
      plan: null,
      billing: null,
      status: null,
      activeMonths: 0,
      followedProjects: 2,
      journeyPoints: 4,
      unreadNotifications: 3,
    });
  });

  it('keeps journeyPoints for a user whose subscription was canceled: cancelling does not erase past impact', async () => {
    const { service } = setup({
      subscription: null,
      journeyPoints: 6,
    });

    const summary = await service.getSummary('user-1');

    expect(summary.status).toBeNull();
    expect(summary.journeyPoints).toBe(6);
  });

  it('reports whole ("completos") months only: a month and a half of active subscription counts as 1, not 2 or 1.5 (floor, not round)', async () => {
    // Started Jul 1, "now" is Aug 16: 1 month and 15 days elapsed.
    jest.useFakeTimers().setSystemTime(new Date('2026-08-16T00:00:00.000Z'));
    const subscription = buildSubscription({ startedAt: new Date('2026-07-01T00:00:00.000Z') });
    const { service } = setup({ subscription });

    const summary = await service.getSummary('user-1');

    expect(summary.activeMonths).toBe(1);
  });

  it('includes journeyPoints and unreadNotifications (and followedProjects) straight from the repository', async () => {
    const subscription = buildSubscription();
    const { service } = setup({
      subscription,
      journeyPoints: 3,
      unreadNotifications: 2,
      followedProjects: 5,
    });

    const summary = await service.getSummary('user-1');

    expect(summary.journeyPoints).toBe(3);
    expect(summary.unreadNotifications).toBe(2);
    expect(summary.followedProjects).toBe(5);
    expect(summary.plan).toEqual(buildPlan());
    expect(summary.billing).toBe(Billing.MONTHLY);
    expect(summary.status).toBe(SubscriptionStatus.ACTIVE);
  });
});
