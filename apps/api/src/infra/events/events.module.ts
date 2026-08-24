import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';
import { OutboxFaultInjector } from './outbox-fault-injector';
import { OutboxRepository } from './outbox.repository';
import { OutboxRelay } from './outbox.relay';

/**
 * Global module exposing `EventBus`, the outbox machinery behind it
 * (`OutboxRepository`, `OutboxRelay`) and `OutboxFaultInjector` so any
 * domain module can publish events without importing another domain
 * module's providers (the one exception to the no-cross-module-import rule
 * is `catalog`, which is read-only; this infra module is a different kind
 * of exception -- it is not a domain module).
 *
 * `OutboxFaultInjector` is exported specifically so e2e tests can reach it
 * via `app.get(OutboxFaultInjector)` to deterministically force a delivery
 * failure -- see its class doc.
 *
 * Wired into `AppModule` (`app.module.ts`): `PrismaModule` is also `@Global`,
 * so `OutboxRepository` resolves `PrismaService` without this module
 * importing `PrismaModule` explicitly.
 */
@Global()
@Module({
  providers: [EventBus, OutboxRepository, OutboxRelay, OutboxFaultInjector],
  exports: [EventBus, OutboxRepository, OutboxRelay, OutboxFaultInjector],
})
export class EventsModule {}
