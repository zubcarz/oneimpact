import { JourneySource } from '@prisma/client';
import { EventName } from '../../../infra/events/event-names';
import type { UpsertJourneyPointInput } from '../infrastructure/impact.repository';
import { ImpactRepository } from '../infrastructure/impact.repository';
import type { SubscriptionActivatedEvent } from './impact.listener';
import { ImpactListener } from './impact.listener';

describe('ImpactListener', () => {
  const buildActivatedEvent = (
    overrides: Partial<SubscriptionActivatedEvent['payload']> = {},
  ): SubscriptionActivatedEvent => ({
    type: EventName.SUBSCRIPTION_ACTIVATED,
    occurredAt: new Date('2026-08-15T12:00:00.000Z'),
    payload: { userId: 'user-1', subscriptionId: 'sub-1', ...overrides },
  });

  /**
   * Fake repository that behaves like a real Postgres `upsert` on the
   * `[userId, month, source]` natural key: keying an in-memory `Map` on
   * exactly that triple and always overwriting (never adding) lets this
   * unit test assert the actual invariant -- "one row survives two
   * deliveries" -- instead of only asserting the repository was called.
   */
  const buildFakeRepository = () => {
    const store = new Map<string, UpsertJourneyPointInput>();
    const upsertJourneyPoint = jest.fn((input: UpsertJourneyPointInput) => {
      const key = `${input.userId}::${input.month}::${input.source}`;
      store.set(key, input);
      return Promise.resolve({
        id: 'journey-1',
        userId: input.userId,
        month: input.month,
        source: input.source,
        refId: input.refId,
        createdAt: new Date(),
      });
    });
    return { store, upsertJourneyPoint };
  };

  it('delivering the same subscription.activated event twice leaves exactly one JourneyPoint', async () => {
    const repository = buildFakeRepository();
    const listener = new ImpactListener(repository as unknown as ImpactRepository);
    const event = buildActivatedEvent();

    await listener.handleSubscriptionActivated(event);
    await listener.handleSubscriptionActivated(event);

    // The invariant that matters: at most one row for this key, no matter
    // how many times the event is redelivered.
    expect(repository.store.size).toBe(1);
    expect(repository.upsertJourneyPoint).toHaveBeenCalledTimes(2);
    expect(repository.upsertJourneyPoint).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      month: '2026-08',
      source: JourneySource.SUBSCRIPTION,
      refId: 'sub-1',
    });
    expect(repository.upsertJourneyPoint).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      month: '2026-08',
      source: JourneySource.SUBSCRIPTION,
      refId: 'sub-1',
    });
  });

  it('computes the month in UTC regardless of the event payload', async () => {
    const repository = buildFakeRepository();
    const listener = new ImpactListener(repository as unknown as ImpactRepository);
    // 23:30 UTC on the last day of July: a naive local-timezone calculation
    // running ahead of UTC could push this into August.
    const event = buildActivatedEvent();
    event.occurredAt = new Date('2026-07-31T23:30:00.000Z');

    await listener.handleSubscriptionActivated(event);

    expect(repository.upsertJourneyPoint).toHaveBeenCalledWith(
      expect.objectContaining({ month: '2026-07' }),
    );
  });

  it('does not throw toward the emitter when the repository fails', async () => {
    const upsertJourneyPoint = jest.fn().mockRejectedValue(new Error('db unavailable'));
    const listener = new ImpactListener({ upsertJourneyPoint } as unknown as ImpactRepository);

    await expect(
      listener.handleSubscriptionActivated(buildActivatedEvent()),
    ).resolves.toBeUndefined();
  });

  it('subscription.canceled never touches the repository: journey points are permanent history', () => {
    const upsertJourneyPoint = jest.fn();
    const listener = new ImpactListener({ upsertJourneyPoint } as unknown as ImpactRepository);

    // `handleSubscriptionCanceled` takes no parameter (it never reads the
    // event -- see its class doc); `@OnEvent` still invokes it when
    // `subscription.canceled` fires, it just has nothing to look at.
    listener.handleSubscriptionCanceled();

    expect(upsertJourneyPoint).not.toHaveBeenCalled();
  });
});
