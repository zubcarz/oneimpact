import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainEvent } from './domain-event';
import { OutboxRepository } from './outbox.repository';

/**
 * Single entry point every module uses to publish a `DomainEvent`. The
 * signature `publish(event, tx?)` is DEFINITIVE and must not change.
 *
 * `publish` inserts the event into the `OutboxEvent` table -- inside the
 * caller's transaction when `tx` is passed (so the state change and the
 * outbox row commit or roll back together), or as its own write when it is
 * not. It never delivers the event itself: `OutboxRelay` polls `OutboxEvent`
 * on an interval and delivers unprocessed rows to `@OnEvent` listeners via
 * `EventEmitter2`, retrying failed deliveries up to `OUTBOX_MAX_ATTEMPTS`
 * (`infra/config/env.ts`). Callers that pass `tx` right after a Prisma write
 * inside `tx.$transaction(...)` (e.g.
 * `this.eventBus.publish(event, tx)`) do not need to change anything: this
 * class is the only place the outbox mechanics live.
 */
@Injectable()
export class EventBus {
  constructor(private readonly outbox: OutboxRepository) {}

  async publish<TType extends string, TPayload>(
    event: DomainEvent<TType, TPayload>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.outbox.insert(event, tx);
  }
}
