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

export type RequestFn = <T>(path: string, init?: RequestInit) => Promise<T>;

/** Builds the shared `fetch` wrapper used by every resource module. */
export function createRequestFn({ baseUrl, getToken }: ApiClientOptions): RequestFn {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  };
}
