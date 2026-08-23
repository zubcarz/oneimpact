import { ApiError } from '@oneimpact/api-client';
import { callApi } from '@/api/client';
import { onSessionExpired } from '@/auth/token-store';

const mockSecureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: 'mock status',
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  for (const key of Object.keys(mockSecureStore)) {
    delete mockSecureStore[key];
  }
});

describe('callApi 401 retry', () => {
  it('401 -> refresh succeeds -> retry succeeds: resolves with the second attempt data', async () => {
    mockSecureStore['oneimpact.accessToken'] = 'stale-access';
    mockSecureStore['oneimpact.refreshToken'] = 'stale-refresh';

    let plansCalls = 0;
    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/plans') {
        plansCalls += 1;
        return Promise.resolve(
          plansCalls === 1
            ? jsonResponse(401, { message: 'expired' })
            : jsonResponse(200, { items: [], total: 0 }),
        );
      }
      if (url === '/v1/auth/refresh') {
        return Promise.resolve(
          jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
        );
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const result = await callApi((api) => api.plans.list());

    expect(result).toEqual({ items: [], total: 0 });
    expect(plansCalls).toBe(2);
    expect(mockSecureStore['oneimpact.accessToken']).toBe('new-access');
    expect(mockSecureStore['oneimpact.refreshToken']).toBe('new-refresh');
  });

  it('401 -> refresh fails: clears tokens, notifies the session listener, and propagates the original 401', async () => {
    mockSecureStore['oneimpact.accessToken'] = 'stale-access';
    mockSecureStore['oneimpact.refreshToken'] = 'stale-refresh';

    const sessionExpiredListener = jest.fn();
    const unsubscribe = onSessionExpired(sessionExpiredListener);

    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/plans') {
        return Promise.resolve(jsonResponse(401, { message: 'expired' }));
      }
      if (url === '/v1/auth/refresh') {
        return Promise.resolve(jsonResponse(401, { message: 'invalid refresh token' }));
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    try {
      await callApi((api) => api.plans.list());
      throw new Error('expected callApi to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(401);
    } finally {
      unsubscribe();
    }

    expect(mockSecureStore['oneimpact.accessToken']).toBeUndefined();
    expect(mockSecureStore['oneimpact.refreshToken']).toBeUndefined();
    expect(sessionExpiredListener).toHaveBeenCalledTimes(1);
  });

  it('a 403 never triggers a refresh', async () => {
    mockSecureStore['oneimpact.refreshToken'] = 'stale-refresh';

    let refreshCalls = 0;
    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/plans') {
        return Promise.resolve(jsonResponse(403, { message: 'forbidden' }));
      }
      if (url === '/v1/auth/refresh') {
        refreshCalls += 1;
        return Promise.resolve(jsonResponse(200, { accessToken: 'x', refreshToken: 'y' }));
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    try {
      await callApi((api) => api.plans.list());
      throw new Error('expected callApi to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }

    expect(refreshCalls).toBe(0);
  });

  it('two concurrent 401s share a single refresh call', async () => {
    mockSecureStore['oneimpact.refreshToken'] = 'stale-refresh';

    let refreshCalls = 0;
    let plansCalls = 0;
    let zonesCalls = 0;

    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/plans') {
        plansCalls += 1;
        return Promise.resolve(
          plansCalls === 1 ? jsonResponse(401, {}) : jsonResponse(200, { items: [], total: 0 }),
        );
      }
      if (url === '/v1/zones') {
        zonesCalls += 1;
        return Promise.resolve(
          zonesCalls === 1 ? jsonResponse(401, {}) : jsonResponse(200, { items: [], total: 0 }),
        );
      }
      if (url === '/v1/auth/refresh') {
        refreshCalls += 1;
        return Promise.resolve(
          jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
        );
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const [plans, zones] = await Promise.all([
      callApi((api) => api.plans.list()),
      callApi((api) => api.zones.list()),
    ]);

    expect(plans).toEqual({ items: [], total: 0 });
    expect(zones).toEqual({ items: [], total: 0 });
    expect(refreshCalls).toBe(1);
  });

  it('401 -> refresh succeeds -> the retry returns 401 again: propagates without a second refresh', async () => {
    mockSecureStore['oneimpact.refreshToken'] = 'stale-refresh';

    let refreshCalls = 0;
    let plansCalls = 0;
    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/plans') {
        plansCalls += 1;
        return Promise.resolve(jsonResponse(401, { message: 'still expired' }));
      }
      if (url === '/v1/auth/refresh') {
        refreshCalls += 1;
        return Promise.resolve(
          jsonResponse(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }),
        );
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    try {
      await callApi((api) => api.plans.list());
      throw new Error('expected callApi to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(401);
    }

    expect(plansCalls).toBe(2);
    expect(refreshCalls).toBe(1);
  });
});
