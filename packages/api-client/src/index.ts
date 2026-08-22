import type { LoginInput, RegisterInput } from '@oneimpact/shared';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => Promise<string | null> | string | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

/** Minimal typed fetch wrapper shared by mobile and admin. Endpoints grow with the API. */
export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken ? await getToken() : null;
    const res = await fetch(baseUrl + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(init.headers ?? {}),
      },
    });
    const body = res.status === 204 ? undefined : await res.json().catch(() => undefined);
    if (!res.ok) {
      const message = (body as { message?: string } | undefined)?.message ?? res.statusText;
      throw new ApiError(res.status, message, body);
    }
    return body as T;
  }

  return {
    health: () => request<{ status: string }>('/health'),
    auth: {
      register: (input: RegisterInput) =>
        request('/v1/auth/register', { method: 'POST', body: JSON.stringify(input) }),
      login: (input: LoginInput) =>
        request('/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    },
    plans: { list: () => request('/v1/plans') },
    zones: { list: () => request('/v1/zones') },
    projects: { list: () => request('/v1/projects') },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
