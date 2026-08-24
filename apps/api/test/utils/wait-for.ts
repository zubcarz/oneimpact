const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_INTERVAL_MS = 25;

export interface WaitForOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Polling helper for e2e specs that assert on the effect of an
 * asynchronously delivered outbox event (see hallazgo 5 of
 * `.claude/plans/20260824-api-dashboard-metrics-and-outbox.plan.md`).
 *
 * Retries `fn` every `intervalMs` until it resolves WITHOUT throwing, and
 * returns whatever it resolved to. `fn` is expected to contain the real
 * assertion (e.g. a `supertest` request followed by a Jest `expect`), so a
 * throw from a failed `expect` is treated the same as a throw from any other
 * source: just a reason to retry.
 *
 * If `timeoutMs` elapses without a successful call, the LAST captured error
 * is re-thrown as-is -- never a generic "timed out" error -- so the Jest
 * failure report shows the real assertion diff, not a meaningless timeout
 * message.
 */
export async function waitFor<T>(fn: () => Promise<T>, options: WaitForOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = DEFAULT_INTERVAL_MS } = options;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  for (;;) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (Date.now() >= deadline) {
        throw lastError;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
