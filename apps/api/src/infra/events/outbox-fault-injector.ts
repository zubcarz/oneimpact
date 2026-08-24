import { Injectable } from '@nestjs/common';

/**
 * Test-only seam for `OutboxRelay`. This class NEVER causes a real delivery
 * to fail in production: nothing in `infra/events` or any domain module
 * calls `failNextDeliveryOnce` outside of the e2e suite, which reaches this
 * provider through `app.get(OutboxFaultInjector)` (`EventsModule` exports
 * it) to deterministically exercise the retry/backoff path -- e.g. "the
 * next delivery of `subscription.activated` fails once, then succeeds on
 * the following tick" -- without depending on an actual listener throwing.
 */
@Injectable()
export class OutboxFaultInjector {
  private readonly pendingFailuresByType = new Map<string, number>();

  failNextDeliveryOnce(type: string): void {
    const current = this.pendingFailuresByType.get(type) ?? 0;
    this.pendingFailuresByType.set(type, current + 1);
  }

  /**
   * Consumes one pending failure for `type`, if any. Called once per row per
   * tick by `OutboxRelay` right before it would otherwise emit the event.
   */
  shouldFail(type: string): boolean {
    const remaining = this.pendingFailuresByType.get(type) ?? 0;
    if (remaining <= 0) {
      return false;
    }
    this.pendingFailuresByType.set(type, remaining - 1);
    return true;
  }
}
