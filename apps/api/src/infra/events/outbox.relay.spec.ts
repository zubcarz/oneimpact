import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { OutboxEvent } from '@prisma/client';
import { EventName } from './event-names';
import { OutboxFaultInjector } from './outbox-fault-injector';
import type { OutboxRepository } from './outbox.repository';
import { OutboxRelay } from './outbox.relay';

describe('OutboxRelay', () => {
  const INTERVAL_MS = 1000;
  const BATCH_SIZE = 20;
  const MAX_ATTEMPTS = 5;

  const buildRow = (overrides: Partial<OutboxEvent> = {}): OutboxEvent => ({
    id: 'outbox-1',
    type: EventName.PROJECT_FOLLOWED,
    payload: {
      type: EventName.PROJECT_FOLLOWED,
      occurredAt: '2026-08-24T12:00:00.000Z',
      payload: { projectId: 'project-1', userId: 'user-1' },
    },
    createdAt: new Date('2026-08-24T12:00:00.000Z'),
    processedAt: null,
    attempts: 0,
    lastError: null,
    ...overrides,
  });

  const buildConfig = () => ({
    get: jest.fn((key: string, fallback: number) => {
      switch (key) {
        case 'OUTBOX_RELAY_INTERVAL_MS':
          return INTERVAL_MS;
        case 'OUTBOX_RELAY_BATCH_SIZE':
          return BATCH_SIZE;
        case 'OUTBOX_MAX_ATTEMPTS':
          return MAX_ATTEMPTS;
        default:
          return fallback;
      }
    }),
  });

  const setup = (rows: OutboxEvent[]) => {
    const repository = {
      findPendingBatch: jest.fn().mockResolvedValue(rows),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailedAttempt: jest.fn().mockResolvedValue(undefined),
    };
    const emitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    const faultInjector = new OutboxFaultInjector();
    const config = buildConfig();
    const relay = new OutboxRelay(
      repository as unknown as OutboxRepository,
      emitter as unknown as EventEmitter2,
      faultInjector,
      config as unknown as ConfigService,
    );
    return { relay, repository, emitter, faultInjector, config };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delivers a pending row: emits the reconstructed event and marks it processed', async () => {
    const row = buildRow();
    const { relay, repository, emitter } = setup([row]);

    relay.onModuleInit();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(emitter.emitAsync).toHaveBeenCalledTimes(1);
    expect(emitter.emitAsync).toHaveBeenCalledWith(row.type, row.payload);
    expect(repository.markProcessed).toHaveBeenCalledWith('outbox-1');
    expect(repository.markFailedAttempt).not.toHaveBeenCalled();

    await relay.onModuleDestroy();
  });

  it('records a failed delivery via markFailedAttempt and never marks it processed', async () => {
    const row = buildRow();
    const { relay, repository, emitter } = setup([row]);
    emitter.emitAsync.mockRejectedValue(new Error('listener exploded'));

    relay.onModuleInit();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(repository.markFailedAttempt).toHaveBeenCalledWith('outbox-1', 'listener exploded');
    expect(repository.markProcessed).not.toHaveBeenCalled();

    await relay.onModuleDestroy();
  });

  it('forces a failure through OutboxFaultInjector without ever calling the real emitter', async () => {
    const row = buildRow();
    const { relay, repository, emitter, faultInjector } = setup([row]);
    faultInjector.failNextDeliveryOnce(row.type);

    relay.onModuleInit();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(emitter.emitAsync).not.toHaveBeenCalled();
    expect(repository.markFailedAttempt).toHaveBeenCalledWith(
      'outbox-1',
      expect.stringContaining('Simulated delivery failure'),
    );
    expect(repository.markProcessed).not.toHaveBeenCalled();

    await relay.onModuleDestroy();
  });

  it('stops polling after onModuleDestroy: advancing the clock no longer triggers ticks', async () => {
    const row = buildRow();
    const { relay, repository } = setup([row]);

    relay.onModuleInit();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(repository.findPendingBatch).toHaveBeenCalledTimes(1);

    await relay.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 3);

    expect(repository.findPendingBatch).toHaveBeenCalledTimes(1);
  });
});
