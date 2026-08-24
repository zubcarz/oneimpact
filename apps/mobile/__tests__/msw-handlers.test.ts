/**
 * @jest-environment node
 *
 * `jest-expo`'s default test environment (`@react-native/jest-preset`'s
 * `ReactNativeEnv`) sets `customExportConditions = ['require', 'react-native']`.
 * `msw`'s package.json maps its `./node` subpath to `"react-native": null`
 * (deliberately unavailable for RN bundlers), so under that environment
 * `import 'msw/node'` fails to resolve even though the exact same import
 * resolves fine under plain Node (verified directly). Overriding the
 * environment for this file only, via this docblock, is the narrowest fix:
 * it does not touch `package.json`, `jest.config.*` or any shared config
 * (all out of this task's write-scope) and only affects module resolution
 * conditions for this one file, which runs entirely in Node (no RN APIs).
 */
import { setupServer } from 'msw/node';
import { planSchema, projectSchema, projectWithUpdatesSchema, zoneSchema } from '@oneimpact/shared';
import type { AuthResponse, Zone } from '@oneimpact/shared';
import { handlers } from '@/api/msw/handlers';
import { resetSimulatedState } from '@/api/msw/state';

/**
 * Runs the real MSW handlers (`setupServer` from `msw/node`, the Jest-side
 * equivalent of `msw/native`, action 4) against plain `fetch`. This is the
 * test the plan calls out as THE invariant of the phase: every response body
 * is checked against the same `@oneimpact/shared` zod schema the real API's
 * DTOs are generated from (`packages/shared/src/schemas/*`), not against a
 * hand-picked list of fields -- so a handler that silently drops or
 * mis-types a field fails here, not just at the type level.
 */
const server = setupServer(...handlers);

// Arbitrary absolute origin: `handlers.ts`'s `route()` wildcards the origin
// (`*/v1/...`) specifically so it matches both this absolute URL and a
// relative one, mirroring what `apps/mobile/src/api/client.ts` sends when
// `EXPO_PUBLIC_API_URL` is empty.
const BASE_URL = 'http://msw-test.local';

function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

async function loginAs(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(apiUrl('/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return (await res.json()) as AuthResponse;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetSimulatedState();
});
afterAll(() => server.close());

describe('msw handlers -- contract invariant', () => {
  it('GET /v1/zones returns 5 items, each satisfying zoneSchema', async () => {
    const res = await fetch(apiUrl('/v1/zones'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { items: Zone[]; total: number };
    expect(body.items).toHaveLength(5);
    expect(body.total).toBe(5);
    for (const zone of body.items) {
      expect(() => zoneSchema.parse(zone)).not.toThrow();
    }
  });

  it('GET /v1/plans returns { items, total }, each item satisfying planSchema', async () => {
    const res = await fetch(apiUrl('/v1/plans'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body.total).toBe(body.items.length);
    expect(body.items.length).toBeGreaterThan(0);
    for (const plan of body.items) {
      expect(() => planSchema.parse(plan)).not.toThrow();
    }
  });

  it('GET /v1/projects?zoneSlug=amazonia only returns projects in that zone', async () => {
    const res = await fetch(apiUrl('/v1/projects?zoneSlug=amazonia'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { items: { slug: string }[]; total: number };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.map((project) => project.slug).sort()).toEqual(
      ['amazonia-carbono', 'guainia'].sort(),
    );

    const listBody = (await (await fetch(apiUrl('/v1/projects'))).json()) as {
      items: { id: string }[];
    };
    const { id } = listBody.items[0];
    const detailRes = await fetch(apiUrl(`/v1/projects/${id}`));
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(() => projectWithUpdatesSchema.parse(detail)).not.toThrow();
  });

  it('every project in the unfiltered list satisfies projectSchema', async () => {
    const res = await fetch(apiUrl('/v1/projects'));
    const body = (await res.json()) as { items: unknown[] };
    for (const project of body.items) {
      expect(() => projectSchema.parse(project)).not.toThrow();
    }
  });
});

describe('msw handlers -- negative cases', () => {
  it('GET /v1/me without Authorization responds 401', async () => {
    const res = await fetch(apiUrl('/v1/me'));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('POST /v1/auth/login with invalid credentials responds 401', async () => {
    const res = await fetch(apiUrl('/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@oneimpact.org', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /v1/subscriptions with a card last4 of 0000 responds 402 PAYMENT_DECLINED', async () => {
    const { tokens } = await loginAs('ana@oneimpact.org', 'User123!');

    const res = await fetch(apiUrl('/v1/subscriptions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({
        planId: 'basico',
        billing: 'monthly',
        card: {
          brand: 'visa',
          last4: '0000',
          holder: 'Ana Rodriguez',
          expMonth: 12,
          expYear: 2099,
        },
      }),
    });

    expect(res.status).toBe(402);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('PAYMENT_DECLINED');
  });

  it('GET /v1/admin/metrics as a USER responds 403', async () => {
    const { tokens } = await loginAs('ana@oneimpact.org', 'User123!');

    const res = await fetch(apiUrl('/v1/admin/metrics'), {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    expect(res.status).toBe(403);
  });

  it('GET /v1/admin/metrics as an ADMIN succeeds', async () => {
    const { tokens } = await loginAs('admin@oneimpact.org', 'Admin123!');

    const res = await fetch(apiUrl('/v1/admin/metrics'), {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    expect(res.status).toBe(200);
  });
});
