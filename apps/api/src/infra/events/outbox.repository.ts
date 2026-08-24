import { Injectable } from '@nestjs/common';
import type { OutboxEvent } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DomainEvent } from './domain-event';

/**
 * Only place in `infra/events` allowed to touch `PrismaService` for
 * `OutboxEvent` (same "one repository per Prisma model" pattern as
 * `SubscriptionsRepository` / `ImpactRepository`). `EventBus` and
 * `OutboxRelay` never import `PrismaService` directly.
 */
@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `payload` stored here is the FULL `DomainEvent` envelope
   * (`{type, occurredAt, payload}`), not just `event.payload`: `OutboxRelay`
   * reads a row back and re-emits it through `EventEmitter2.emitAsync`, which
   * expects the same envelope shape listeners already receive via
   * `EventBus.publish` today. Cast through `unknown` (not `any`) because
   * `DomainEvent` is a generic interface Prisma's `InputJsonValue` cannot
   * structurally verify at compile time -- the envelope is documented as
   * plain and JSON-serializable in `domain-event.ts`, so the round trip is
   * safe.
   */
  async insert(event: DomainEvent, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.outboxEvent.create({
      data: {
        type: event.type,
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Rows `OutboxRelay` should try to deliver this tick: unprocessed and
   * under the attempt ceiling. A row that reaches `maxAttempts` simply stops
   * being returned here -- see the plan's D1 decision for why there is no
   * separate "FAILED" status column.
   */
  findPendingBatch(limit: number, maxAttempts: number): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: { processedAt: null, attempts: { lt: maxAttempts } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  async markFailedAttempt(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: error },
    });
  }

  /** Backs the admin outbox inspection endpoint (later phase of this plan). */
  listRecent(limit: number): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
