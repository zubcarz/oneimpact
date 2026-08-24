import { describe, expect, it, vi } from 'vitest';
import { createSingleFlight } from './single-flight';

/** A promise plus its resolvers, to hold an execution open on purpose. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createSingleFlight', () => {
  it('collapses two concurrent calls with the same key into one execution', async () => {
    const gate = deferred<string>();
    const execute = vi.fn(() => gate.promise);
    const flight = createSingleFlight<string>();

    const first = flight.run('refresh-token-a', execute);
    const second = flight.run('refresh-token-a', execute);

    expect(execute).toHaveBeenCalledTimes(1);

    gate.resolve('new-pair');
    await expect(first).resolves.toBe('new-pair');
    await expect(second).resolves.toBe('new-pair');
  });

  it('gives the exact same promise to every joiner', () => {
    const flight = createSingleFlight<string>();
    const execute = () => deferred<string>().promise;

    expect(flight.run('refresh-token-a', execute)).toBe(flight.run('refresh-token-a', execute));
  });

  it('runs again once the previous execution settled', async () => {
    const execute = vi.fn(() => Promise.resolve('pair'));
    const flight = createSingleFlight<string>();

    await flight.run('refresh-token-a', execute);
    await flight.run('refresh-token-a', execute);

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('never shares the result between different keys', async () => {
    // Two sessions in the same process: joining them would hand one admin the
    // token pair of the other.
    const gateA = deferred<string>();
    const gateB = deferred<string>();
    const execute = vi.fn().mockReturnValueOnce(gateA.promise).mockReturnValueOnce(gateB.promise);
    const flight = createSingleFlight<string>();

    const first = flight.run('refresh-token-a', execute);
    const second = flight.run('refresh-token-b', execute);

    expect(execute).toHaveBeenCalledTimes(2);

    gateA.resolve('pair-a');
    gateB.resolve('pair-b');
    await expect(first).resolves.toBe('pair-a');
    await expect(second).resolves.toBe('pair-b');
  });

  it('shares the failure with the joiners but does not cache it', async () => {
    const gate = deferred<string>();
    const execute = vi
      .fn()
      .mockReturnValueOnce(gate.promise)
      .mockReturnValueOnce(Promise.resolve('pair'));
    const flight = createSingleFlight<string>();

    const first = flight.run('refresh-token-a', execute);
    const second = flight.run('refresh-token-a', execute);
    gate.reject(new Error('refresh rejected'));

    await expect(first).rejects.toThrow('refresh rejected');
    await expect(second).rejects.toThrow('refresh rejected');
    expect(execute).toHaveBeenCalledTimes(1);

    // The entry was cleared on rejection, so a later caller retries.
    await expect(flight.run('refresh-token-a', execute)).resolves.toBe('pair');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not cache a resolved failure value either', async () => {
    // The gateway executor swallows the error and resolves to `null`; that
    // `null` must not survive the flight.
    const execute = vi
      .fn()
      .mockReturnValueOnce(Promise.resolve(null))
      .mockReturnValueOnce(Promise.resolve('pair'));
    const flight = createSingleFlight<string | null>();

    await expect(flight.run('refresh-token-a', execute)).resolves.toBeNull();
    await expect(flight.run('refresh-token-a', execute)).resolves.toBe('pair');
  });
});
