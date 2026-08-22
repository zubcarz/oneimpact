import { PrismaClient } from '@prisma/client';
import { seed } from '../../prisma/seed';

/**
 * Runs `seed()` exactly once per test process, no matter how many e2e specs
 * call `seedOnce()`. The promise is memoized at module scope, so concurrent
 * callers (within the same Jest worker) await the same run instead of
 * triggering their own `seed()` and racing each other's `upsert`s (P2002).
 *
 * Safe across specs because `jest-e2e.json` pins `maxWorkers: 1`: specs run
 * in separate processes but never in parallel, so there is only ever one
 * in-flight seed at a time.
 */
let seedPromise: Promise<void> | null = null;

export function seedOnce(client: PrismaClient): Promise<void> {
  if (!seedPromise) {
    seedPromise = seed(client);
  }
  return seedPromise;
}
