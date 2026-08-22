import { Injectable } from '@nestjs/common';
import { EventEmitterModule, OnEvent } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import type { DomainEvent } from './domain-event';
import { EventName } from './event-names';
import { EventBus } from './event-bus';

interface ProjectFollowedPayload {
  projectId: string;
  userId: string;
}

@Injectable()
class TestListener {
  received: DomainEvent<typeof EventName.PROJECT_FOLLOWED, ProjectFollowedPayload>[] = [];

  @OnEvent(EventName.PROJECT_FOLLOWED)
  handle(event: DomainEvent<typeof EventName.PROJECT_FOLLOWED, ProjectFollowedPayload>) {
    this.received.push(event);
  }
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

  const setup = async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot({ wildcard: true })],
      providers: [EventBus, TestListener],
    }).compile();

    const app = await moduleRef.init();
    return {
      eventBus: app.get(EventBus),
      listener: app.get(TestListener),
      close: () => app.close(),
    };
  };

  it('delivers the published event and its payload to a registered @OnEvent listener', async () => {
    const { eventBus, listener, close } = await setup();
    const event = buildEvent();

    await eventBus.publish(event);

    expect(listener.received).toHaveLength(1);
    expect(listener.received[0]).toEqual(event);
    expect(listener.received[0].payload).toEqual({ projectId: 'project-1', userId: 'user-1' });

    await close();
  });

  it('behaves the same whether or not a tx is passed (ignored today, kept for the outbox migration)', async () => {
    const { eventBus, listener, close } = await setup();
    const eventWithoutTx = buildEvent();
    const eventWithTx = buildEvent();

    await eventBus.publish(eventWithoutTx);
    // `tx` is not a real Prisma.TransactionClient here: publish() ignores it
    // completely today, so any value (including undefined-shaped casts) must
    // not change the observable behavior.
    await eventBus.publish(eventWithTx, undefined);

    expect(listener.received).toHaveLength(2);
    expect(listener.received[0]).toEqual(eventWithoutTx);
    expect(listener.received[1]).toEqual(eventWithTx);

    await close();
  });
});
