import { act } from '@testing-library/react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Role } from '@oneimpact/shared';
import { AuthProvider } from '@/auth/AuthProvider';
import { useAuth } from '@/auth/useAuth';
import { useRequireRole } from '@/auth/useRequireRole';

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

const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockRouterReplace(...args) },
  usePathname: () => '/',
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: 'mock status',
    json: () => Promise.resolve(body),
  } as Response;
}

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

beforeEach(() => {
  for (const key of Object.keys(mockSecureStore)) {
    delete mockSecureStore[key];
  }
  mockRouterReplace.mockClear();
});

describe('AuthProvider / useAuth', () => {
  it('starts as guest with no stored token, signIn persists the tokens and moves to authed', async () => {
    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/auth/login') {
        return Promise.resolve(
          jsonResponse(200, {
            user: { id: 'u1', email: 'demo@oneimpact.org', name: 'Demo', role: Role.USER },
            tokens: { accessToken: 'access-1', refreshToken: 'refresh-1' },
          }),
        );
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('guest'));

    await act(async () => {
      await result.current.signIn({ email: 'demo@oneimpact.org', password: 'password123' });
    });

    expect(mockSecureStore['oneimpact.accessToken']).toBe('access-1');
    expect(mockSecureStore['oneimpact.refreshToken']).toBe('refresh-1');
    expect(result.current.status).toBe('authed');
    expect(result.current.user?.email).toBe('demo@oneimpact.org');
  });

  it('signOut clears the stored tokens and returns to guest', async () => {
    mockSecureStore['oneimpact.accessToken'] = 'access-1';
    mockSecureStore['oneimpact.refreshToken'] = 'refresh-1';

    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/me') {
        return Promise.resolve(
          jsonResponse(200, {
            id: 'u1',
            email: 'demo@oneimpact.org',
            name: 'Demo',
            role: Role.USER,
          }),
        );
      }
      if (url === '/v1/auth/logout') {
        return Promise.resolve(jsonResponse(200, null));
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('authed'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSecureStore['oneimpact.accessToken']).toBeUndefined();
    expect(mockSecureStore['oneimpact.refreshToken']).toBeUndefined();
    expect(result.current.status).toBe('guest');
    expect(result.current.user).toBeNull();
  });

  it('boots with a valid stored token into authed, with the role GET /me returns', async () => {
    mockSecureStore['oneimpact.accessToken'] = 'access-1';
    mockSecureStore['oneimpact.refreshToken'] = 'refresh-1';

    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/me') {
        return Promise.resolve(
          jsonResponse(200, {
            id: 'u1',
            email: 'admin@oneimpact.org',
            name: 'Admin',
            role: Role.ADMIN,
          }),
        );
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('authed'));
    expect(result.current.user?.role).toBe(Role.ADMIN);
  });

  it('boots with an invalid stored token (GET /me 401, refresh also fails): guest with secure-store cleared', async () => {
    mockSecureStore['oneimpact.accessToken'] = 'stale-access';
    mockSecureStore['oneimpact.refreshToken'] = 'stale-refresh';

    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/me') {
        return Promise.resolve(jsonResponse(401, { message: 'expired' }));
      }
      if (url === '/v1/auth/refresh') {
        return Promise.resolve(jsonResponse(401, { message: 'invalid refresh token' }));
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.status).toBe('guest'));
    expect(result.current.user).toBeNull();
    expect(mockSecureStore['oneimpact.accessToken']).toBeUndefined();
    expect(mockSecureStore['oneimpact.refreshToken']).toBeUndefined();
  });
});

describe('useRequireRole', () => {
  it('does not grant access to a USER when ADMIN is required, and redirects away', async () => {
    mockSecureStore['oneimpact.accessToken'] = 'access-1';
    mockSecureStore['oneimpact.refreshToken'] = 'refresh-1';

    globalThis.fetch = jest.fn((url: string) => {
      if (url === '/v1/me') {
        return Promise.resolve(
          jsonResponse(200, {
            id: 'u1',
            email: 'demo@oneimpact.org',
            name: 'Demo',
            role: Role.USER,
          }),
        );
      }
      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useRequireRole(Role.ADMIN), { wrapper: createWrapper() });

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
