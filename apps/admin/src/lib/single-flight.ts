/**
 * Single-flight: collapses concurrent executions that share the same key into
 * one, so N callers arriving while an operation is in flight all await the very
 * same promise instead of starting N operations.
 *
 * It exists for the token refresh of the gateway. The API rotates the refresh
 * token and treats a second use of an already rotated one as token reuse:
 * it revokes the whole chain for that user
 * (apps/api/src/modules/auth/application/auth.service.ts:111-119). So two
 * parallel queries expiring at the same second -- the normal case as soon as a
 * screen fires several TanStack Query requests -- would log the admin out
 * completely. Serialising the refresh is a correctness fix, not a performance
 * one.
 *
 * The operation is injected, which is what makes this file testable without a
 * request, a network call or `next/headers`.
 *
 * **Known limitation, deliberately not hidden: the scope is the process.** With
 * several Next instances behind a load balancer the race comes back, because
 * each instance has its own module state. Solving that needs shared state
 * (Redis, or the refresh moved to a single service). For this delivery, which
 * runs a single process, this is enough.
 *
 * On `next dev` hot reload the module can be re-evaluated and the in-flight
 * entry lost. The worst case is two refreshes in the same instant during
 * development, exactly the situation that already existed before this helper;
 * it never produces a wrong result, so it is not worth guarding against.
 */

interface InFlight<T> {
  key: string;
  promise: Promise<T>;
}

export interface SingleFlight<T> {
  /**
   * Runs `execute`, or joins the execution already in flight **for the same
   * key**. The entry is cleared as soon as it settles, whether it fulfils or
   * rejects: a failure is never cached, the next caller retries.
   */
  run(key: string, execute: () => Promise<T>): Promise<T>;
}

export function createSingleFlight<T>(): SingleFlight<T> {
  let inFlight: InFlight<T> | null = null;

  return {
    run(key: string, execute: () => Promise<T>): Promise<T> {
      const current = inFlight;
      // The key matters: the in-flight refresh was started with one concrete
      // refresh token. A caller carrying a different `oi_refresh` -- another
      // admin's session in the same process, or a cookie that was already
      // rotated -- would get back a token pair that does not belong to its
      // session, which is both wrong and a cross-session leak. Different key,
      // its own execution.
      if (current !== null && current.key === key) return current.promise;

      const promise = execute();
      const entry: InFlight<T> = { key, promise };
      inFlight = entry;

      // `then(clear, clear)` and not `finally`: `finally` returns a promise
      // that rejects along with the original one, and nobody would be handling
      // it here (unhandled rejection). This form settles on its own and leaves
      // the rejection for the real callers.
      const clear = (): void => {
        // Only if it is still this entry: a later `run` may have replaced it.
        if (inFlight === entry) inFlight = null;
      };
      void promise.then(clear, clear);

      return promise;
    },
  };
}
