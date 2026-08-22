import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';

/**
 * Global module exposing `EventBus` so any domain module can inject it
 * without importing another domain module's providers (the one exception to
 * the no-cross-module-import rule is `catalog`, which is read-only; this
 * infra module is a different kind of exception -- it is not a domain
 * module).
 *
 * Not wired into `AppModule` yet: that registration is a separate task in
 * this plan's phase (`app.module.ts` is out of scope for this task).
 */
@Global()
@Module({
  providers: [EventBus],
  exports: [EventBus],
})
export class EventsModule {}
