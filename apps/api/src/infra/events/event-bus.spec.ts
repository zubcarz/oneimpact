import type { Prisma } from '@prisma/client';
import type { DomainEvent } from './domain-event';
import { EventName } from './event-names';
import { EventBus } from './event-bus';
import type { OutboxRepository } from './outbox.repository';

interface ProjectFollowedPayload {
  projectId: string;
  userId: string;
}

describe('EventBus', () => {
  const buildEvent = (): DomainEvent<
    typeof EventName.PROJECT_FOLLOWED,
    ProjectFollowedPayload
  > => ({
    type: EventName.PROJECT_FOLLOWED,
    occurredAt: new Date(),
    payload: { projectId: 'project-1', userId: 'user-1' },
  });

  const buildOutbox = () => ({ insert: jest.fn().mockResolvedValue(undefined) });

  /**
   * Since the outbox landed, `publish` no longer delivers to listeners
   * synchronously (that is `OutboxRelay`'s job now, see
   * `outbox.relay.spec.ts`) -- it only inserts the event envelope into
   * `OutboxEvent` through `OutboxRepository`. These tests assert that
   * hand-off, not delivery.
   */
  it('inserts the event into the outbox with no tx when publish is called without one', async () => {
    const outbox = buildOutbox();
    const eventBus = new EventBus(outbox as unknown as OutboxRepository);
    const event = buildEvent();

    await eventBus.publish(event);

    expect(outbox.insert).toHaveBeenCalledTimes(1);
    expect(outbox.insert).toHaveBeenCalledWith(event, undefined);
  });

  it('forwards the tx to the outbox insert so it commits in the same transaction as the caller', async () => {
    const outbox = buildOutbox();
    const eventBus = new EventBus(outbox as unknown as OutboxRepository);
    const event = buildEvent();
    // Not a real Prisma.TransactionClient -- publish() forwards whatever it
    // is given to OutboxRepository.insert without inspecting it, so a plain
    // marker object is enough to assert the hand-off.
    const tx = { marker: 'fake-tx' } as unknown as Prisma.TransactionClient;

    await eventBus.publish(event, tx);

    expect(outbox.insert).toHaveBeenCalledTimes(1);
    expect(outbox.insert).toHaveBeenCalledWith(event, tx);
  });
});
