import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { OutboxEvent } from '@prisma/client';
import type { DomainEvent } from './domain-event';
import { OutboxFaultInjector } from './outbox-fault-injector';
import { OutboxRepository } from './outbox.repository';

const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Delivers `OutboxEvent` rows to `@OnEvent` listeners on a plain
 * `setInterval`, deliberately NOT `@nestjs/schedule`'s `@Interval`: that
 * decorator does not clear its timer on `app.close()` unless the app also
 * calls `enableShutdownHooks()`, which this repo's test bootstrap does not
 * do anywhere. `OnModuleInit`/`OnModuleDestroy` already run on `app.close()`
 * without that extra step, so a hand-rolled `setInterval` gets the same
 * "stop cleanly when the app shuts down" behavior for one line of cleanup
 * code, without adding a dependency (see the plan's D2 decision).
 */
@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelay.name);
  private intervalHandle: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly repository: OutboxRepository,
    private readonly emitter: EventEmitter2,
    private readonly faultInjector: OutboxFaultInjector,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get<number>('OUTBOX_RELAY_INTERVAL_MS', DEFAULT_INTERVAL_MS);
    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  /**
   * Skips this tick entirely (instead of queueing) if the previous one is
   * still in flight: a batch that takes longer than the interval to deliver
   * must not overlap with the next poll and process the same rows twice
   * before either finishes marking them.
   */
  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const batchSize = this.config.get<number>('OUTBOX_RELAY_BATCH_SIZE', DEFAULT_BATCH_SIZE);
      const maxAttempts = this.config.get<number>('OUTBOX_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS);
      const batch = await this.repository.findPendingBatch(batchSize, maxAttempts);
      for (const row of batch) {
        await this.deliver(row);
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Never throws: a delivery failure is recorded on the row
   * (`markFailedAttempt`) and the relay moves on to the next row in the
   * batch. Only `type`/`id`/elapsed ms (and, on failure, the error message)
   * are logged -- never `event.payload`, per the repo's no-PII-in-logs rule.
   */
  private async deliver(row: OutboxEvent): Promise<void> {
    const event = row.payload as unknown as DomainEvent;
    const startedAt = Date.now();
    try {
      if (this.faultInjector.shouldFail(row.type)) {
        throw new Error(`Simulated delivery failure for ${row.type} (test fault injector)`);
      }
      await this.emitter.emitAsync(row.type, event);
      await this.repository.markProcessed(row.id);
      this.logger.log(
        `Delivered outbox event type=${row.type} id=${row.id} ms=${Date.now() - startedAt}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.markFailedAttempt(row.id, message);
      this.logger.warn(
        `Failed to deliver outbox event type=${row.type} id=${row.id} ms=${Date.now() - startedAt}: ${message}`,
      );
    }
  }
}
