import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { DomainEvent } from './domain-event';

/**
 * Single entry point every module uses to publish a `DomainEvent`. The
 * signature `publish(event, tx?)` is DEFINITIVE and must not change:
 *
 * - TODAY (this task, item 12 not done yet): `publish` just forwards the
 *   event to the in-process `EventEmitter2` via `emitAsync(event.type, event)`
 *   and IGNORES `tx`. There is no outbox table yet, so there is nothing to
 *   write inside a transaction.
 * - `tx` is accepted (and typed as `Prisma.TransactionClient`) even though it
 *   is unused today so that callers can already pass their transaction
 *   client at the call site (e.g. `this.eventBus.publish(event, tx)` right
 *   after a Prisma write inside `tx.$transaction(...)`). Item 12 replaces the
 *   body of this method with an `INSERT` into `OutboxEvent` using that same
 *   `tx`, in the same transaction as the state change, and an `OutboxRelay`
 *   (`@Interval`) delivers it to `@OnEvent` listeners afterwards. Modules that
 *   call `publish` today do not need to change anything when that lands --
 *   only this method's body does.
 */
@Injectable()
export class EventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish<TType extends string, TPayload>(
    event: DomainEvent<TType, TPayload>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    // `tx` is intentionally unused until item 12 (outbox) reads it. Kept as a
    // no-op reference instead of an eslint-disable, see class doc above.
    void tx;
    await this.emitter.emitAsync(event.type, event);
  }
}
