import { PlanId, ProjectStatus } from '@oneimpact/shared';
import type { AdminMetricsRepository } from '../infrastructure/admin-metrics.repository';
import { AdminMetricsService } from './admin-metrics.service';

describe('AdminMetricsService', () => {
  const buildRepository = () => ({
    countUsers: jest.fn().mockResolvedValue(2),
    countActiveSubscriptionsByPlan: jest
      .fn()
      .mockResolvedValue({ [PlanId.BASICO]: 1, [PlanId.ESTANDAR]: 1, [PlanId.PREMIUM]: 0 }),
    listActiveSubscriptionsWithPlan: jest.fn().mockResolvedValue([]),
    countProjectsByStatus: jest.fn().mockResolvedValue({
      [ProjectStatus.PLANNED]: 0,
      [ProjectStatus.ACTIVE]: 4,
      [ProjectStatus.COMPLETED]: 1,
    }),
    countUpdatesSince: jest.fn().mockResolvedValue(3),
    avgProgressByZone: jest.fn().mockResolvedValue([]),
  });

  const setup = () => {
    const repository = buildRepository();
    const service = new AdminMetricsService(repository as unknown as AdminMetricsRepository);
    return { repository, service };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('serves a second call within 30s from the in-memory cache without hitting the repository again', async () => {
    const { repository, service } = setup();

    await service.getMetrics();
    await service.getMetrics();

    expect(repository.countUsers).toHaveBeenCalledTimes(1);
    expect(repository.countActiveSubscriptionsByPlan).toHaveBeenCalledTimes(1);
    expect(repository.listActiveSubscriptionsWithPlan).toHaveBeenCalledTimes(1);
    expect(repository.countProjectsByStatus).toHaveBeenCalledTimes(1);
    expect(repository.countUpdatesSince).toHaveBeenCalledTimes(1);
    expect(repository.avgProgressByZone).toHaveBeenCalledTimes(1);
  });

  it('recomputes once the cache has expired (more than 30s later)', async () => {
    const { repository, service } = setup();

    await service.getMetrics();
    jest.advanceTimersByTime(30_001);
    await service.getMetrics();

    expect(repository.countUsers).toHaveBeenCalledTimes(2);
  });
});
