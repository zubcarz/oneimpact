import { Test } from '@nestjs/testing';
import { EventName } from '../../../infra/events/event-names';
import { UsersRepository } from '../infrastructure/users.repository';
import { UsersListener, type SubscriptionActivatedEvent } from './users.listener';

describe('UsersListener', () => {
  const buildEvent = (userId: string): SubscriptionActivatedEvent => ({
    type: EventName.SUBSCRIPTION_ACTIVATED,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    payload: { userId },
  });

  const setup = async () => {
    const repository = {
      findById: jest.fn(),
      updateName: jest.fn(),
      list: jest.fn(),
      updateRole: jest.fn(),
      countAdmins: jest.fn(),
      markOnboardingCompleted: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersListener, UsersRepository],
    })
      .overrideProvider(UsersRepository)
      .useValue(repository)
      .compile();

    return {
      listener: moduleRef.get(UsersListener),
      repository,
    };
  };

  it('marks onboarding as completed for the user in the event payload', async () => {
    const { listener, repository } = await setup();
    repository.markOnboardingCompleted.mockResolvedValue(undefined);

    await listener.handleSubscriptionActivated(buildEvent('user-1'));

    expect(repository.markOnboardingCompleted).toHaveBeenCalledWith('user-1');
  });

  it('is idempotent: handling the same event twice leaves the same final state', async () => {
    const { listener, repository } = await setup();
    repository.markOnboardingCompleted.mockResolvedValue(undefined);
    const event = buildEvent('user-1');

    await listener.handleSubscriptionActivated(event);
    await listener.handleSubscriptionActivated(event);

    expect(repository.markOnboardingCompleted).toHaveBeenCalledTimes(2);
    expect(repository.markOnboardingCompleted).toHaveBeenNthCalledWith(1, 'user-1');
    expect(repository.markOnboardingCompleted).toHaveBeenNthCalledWith(2, 'user-1');
  });

  it('never propagates an exception thrown by the repository (emitter already committed)', async () => {
    const { listener, repository } = await setup();
    repository.markOnboardingCompleted.mockRejectedValue(new Error('db connection lost'));

    await expect(
      listener.handleSubscriptionActivated(buildEvent('user-1')),
    ).resolves.toBeUndefined();
  });
});
