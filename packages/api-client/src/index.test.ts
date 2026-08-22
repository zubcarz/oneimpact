import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './index';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createApiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('publishes a project update with auth header and serialized body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        id: 'u1',
        projectId: 'p1',
        title: 'Avance',
        body: 'Se completo la primera fase',
        progress: 40,
        publishedAt: '2026-08-22T00:00:00.000Z',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({ baseUrl: 'http://api.test', getToken: () => 'token-abc' });
    const input = { title: 'Avance', body: 'Se completo la primera fase', progress: 40 };

    await client.projects.publishUpdate('p1', input);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/v1/projects/p1/updates');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer token-abc');
    expect(init.body).toBe(JSON.stringify(input));
  });

  it('throws ApiError with the response status on 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { message: 'No autorizado' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({ baseUrl: 'http://api.test' });

    await expect(client.me.get()).rejects.toBeInstanceOf(ApiError);
    try {
      await client.me.get();
      throw new Error('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
    }
  });

  it('never serializes the raw card number when creating a subscription', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, {
        id: 's1',
        userId: 'u1',
        planId: 'estandar',
        billing: 'monthly',
        status: 'ACTIVE',
        startedAt: '2026-08-22T00:00:00.000Z',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({ baseUrl: 'http://api.test' });
    await client.subscriptions.create({
      planId: 'estandar',
      billing: 'monthly',
      card: {
        brand: 'visa',
        last4: '4242',
        holder: 'Jane Doe',
        expMonth: 12,
        expYear: 2030,
      },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const serialized = init.body as string;
    expect(serialized).not.toMatch(/"number"/);
    expect(serialized).not.toMatch(/"pan"/);
    expect(serialized).not.toMatch(/"cardNumber"/);
    expect(serialized).toContain('"last4":"4242"');
  });

  it('appends query params for filtered project lists and omits them otherwise', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { items: [], total: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({ baseUrl: 'http://api.test' });

    await client.projects.list({ zoneSlug: 'amazonia' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/v1/projects?zoneSlug=amazonia');

    await client.projects.list();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://api.test/v1/projects');
  });

  it('resolves without throwing on a 204 cancel response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(204, undefined));
    vi.stubGlobal('fetch', fetchMock);

    const client = createApiClient({ baseUrl: 'http://api.test' });

    await expect(client.subscriptions.cancel()).resolves.toBeUndefined();
  });
});
