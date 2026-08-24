import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { composePublicUrl, signAndUpload, UPLOAD_FAILED_MESSAGE } from './upload';

/**
 * `signAndUpload` with `fetch` mocked, which covers both requests it can make:
 * the signature (through `browserApi`, which is a `fetch` to `/api/gateway`) and
 * the direct PUT to storage. No jsdom is involved -- `File` and `fetch` are
 * globals of Node 20+, so this stays a pure logic test (decision D5).
 */

const PUBLIC_URL_VAR = 'NEXT_PUBLIC_SUPABASE_PUBLIC_URL';

interface SignedUploadBody {
  uploadUrl: string;
  key: string;
  expiresAt: string;
  simulated: boolean;
}

/** Shape of the signature response, as `POST /v1/uploads/sign` really answers it. */
function signedBody(overrides: Partial<SignedUploadBody> = {}): SignedUploadBody {
  return {
    uploadUrl: 'https://storage.example.com/signed/uploads/abc-foto.jpg?token=x',
    key: 'uploads/abc-foto.jpg',
    expiresAt: '2026-08-24T02:20:59.094Z',
    simulated: false,
    ...overrides,
  };
}

/** The little of `Response` that `createRequestFn` and `signAndUpload` touch. */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  } as unknown as Response;
}

function emptyResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => undefined,
  } as unknown as Response;
}

function imageFile(): File {
  return new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv(PUBLIC_URL_VAR, 'https://storage.example.com/object/public/media');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('signAndUpload', () => {
  it('sends no bytes and returns no url when the API reports simulated storage', async () => {
    // The everyday case in local and in CI: the API has no Supabase credentials.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        signedBody({
          uploadUrl: 'local-simulated://uploads/uploads/abc-foto.jpg',
          simulated: true,
        }),
      ),
    );

    const result = await signAndUpload(imageFile());

    expect(result).toEqual({ simulated: true });
    // `mediaUrl` is absent, not empty: an omitted optional field validates,
    // while '' does not pass `z.url()`.
    expect(result.mediaUrl).toBeUndefined();
    // Only the signature. No PUT to an address nothing can resolve.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks the API to sign the real filename and content type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(signedBody({ simulated: true })));

    await signAndUpload(imageFile());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/gateway/v1/uploads/sign');
    expect(init?.method).toBe('POST');
    // The field is `filename`, lowercase, as `uploadSignSchema` declares it
    // (packages/shared/src/schemas/payment.ts:109-112).
    expect(JSON.parse(String(init?.body))).toEqual({
      filename: 'foto.jpg',
      contentType: 'image/jpeg',
    });
  });

  it('puts the file at the signed url and composes the public one', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(signedBody()))
      .mockResolvedValueOnce(emptyResponse(200));

    const file = imageFile();
    const result = await signAndUpload(file);

    expect(result).toEqual({
      mediaUrl: 'https://storage.example.com/object/public/media/uploads/abc-foto.jpg',
      simulated: false,
    });

    const [url, init] = fetchMock.mock.calls[1];
    // Straight to storage, never through `/api/gateway`: the panel does not
    // proxy bytes.
    expect(url).toBe('https://storage.example.com/signed/uploads/abc-foto.jpg?token=x');
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe(file);
  });

  it('fails in Spanish when the transfer is rejected, without inventing a url', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(signedBody()))
      .mockResolvedValueOnce(emptyResponse(403));

    await expect(signAndUpload(imageFile())).rejects.toThrow(UPLOAD_FAILED_MESSAGE);
  });

  it('degrades to simulated when the public base url is not configured', async () => {
    // Storage is real on the API side, but the panel cannot build a link to the
    // object, so uploading it would leave bytes nobody can reference.
    vi.stubEnv(PUBLIC_URL_VAR, '');
    fetchMock.mockResolvedValueOnce(jsonResponse(signedBody()));

    const result = await signAndUpload(imageFile());

    expect(result).toEqual({ simulated: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates a failed signature instead of publishing silently', async () => {
    // A 403 here means the session is no longer that of an admin. Swallowing it
    // would show "almacenamiento simulado" for what is really an auth problem.
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Prohibido' }, 403));

    await expect(signAndUpload(imageFile())).rejects.toThrow('Prohibido');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('composePublicUrl', () => {
  it('joins base and key with a single slash', () => {
    expect(composePublicUrl('https://x.example.com/media', 'uploads/a.jpg')).toBe(
      'https://x.example.com/media/uploads/a.jpg',
    );
  });

  it('does not double the slash when the base url ends with one', () => {
    // The usual shape of the value in a deployment environment file.
    expect(composePublicUrl('https://x.example.com/media/', 'uploads/a.jpg')).toBe(
      'https://x.example.com/media/uploads/a.jpg',
    );
  });

  it('does not double the slash when the key starts with one', () => {
    expect(composePublicUrl('https://x.example.com/media', '/uploads/a.jpg')).toBe(
      'https://x.example.com/media/uploads/a.jpg',
    );
  });
});
