import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, isSessionExpired } from './session';

/** Encodes a string as base64url, the same way a JWT segment is encoded. */
function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Builds a token with a real base64url payload and a dummy signature. */
function makeToken(rawPayload: string): string {
  return [toBase64Url('{"alg":"HS256","typ":"JWT"}'), toBase64Url(rawPayload), 'signature'].join(
    '.',
  );
}

const validPayload = {
  sub: 'cmt4s8snr0000kpw4qxz96ah7',
  email: 'admin@oneimpact.org',
  role: 'ADMIN',
  iat: 1787537136,
  exp: 1787538036,
};

describe('decodeJwtPayload', () => {
  it('returns the claims of a well formed token', () => {
    const payload = decodeJwtPayload(makeToken(JSON.stringify(validPayload)));

    expect(payload).toEqual({
      sub: 'cmt4s8snr0000kpw4qxz96ah7',
      email: 'admin@oneimpact.org',
      role: 'ADMIN',
      exp: 1787538036,
    });
  });

  it('decodes non-ascii characters as utf-8', () => {
    const payload = decodeJwtPayload(
      makeToken(JSON.stringify({ ...validPayload, email: 'josé@oneimpact.org' })),
    );

    expect(payload?.email).toBe('josé@oneimpact.org');
  });

  it('returns null when the payload is not json', () => {
    expect(decodeJwtPayload(makeToken('not json at all'))).toBeNull();
  });

  it('returns null for a token without segments', () => {
    expect(decodeJwtPayload('abc')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeJwtPayload('')).toBeNull();
  });

  it('returns null when the payload segment is not valid base64', () => {
    expect(decodeJwtPayload('header.%%%%%.signature')).toBeNull();
  });

  it('returns null when the payload segment is not valid utf-8', () => {
    // 0xff is never a valid utf-8 lead byte.
    expect(decodeJwtPayload(`header.${btoa('\xff\xfe')}.signature`)).toBeNull();
  });

  it('returns null when a required claim is missing', () => {
    const withoutRole = { sub: 'user-1', email: 'admin@oneimpact.org', exp: 1787538036 };
    const withoutExp = { sub: 'user-1', email: 'admin@oneimpact.org', role: 'ADMIN' };

    expect(decodeJwtPayload(makeToken(JSON.stringify(withoutRole)))).toBeNull();
    expect(decodeJwtPayload(makeToken(JSON.stringify(withoutExp)))).toBeNull();
  });

  it('returns null when a claim has the wrong type', () => {
    const numericRole = { ...validPayload, role: 7 };
    const stringExp = { ...validPayload, exp: '1787538036' };

    expect(decodeJwtPayload(makeToken(JSON.stringify(numericRole)))).toBeNull();
    expect(decodeJwtPayload(makeToken(JSON.stringify(stringExp)))).toBeNull();
  });

  it('returns null when the payload is a json value that is not an object', () => {
    expect(decodeJwtPayload(makeToken('"a string"'))).toBeNull();
    expect(decodeJwtPayload(makeToken('null'))).toBeNull();
  });
});

describe('isSessionExpired', () => {
  const nowMs = 1787538000_000;

  it('is true when exp is in the past', () => {
    expect(isSessionExpired({ exp: 1787537100 }, nowMs)).toBe(true);
  });

  it('is true when exp is exactly now', () => {
    expect(isSessionExpired({ exp: 1787538000 }, nowMs)).toBe(true);
  });

  it('is false while the token is still valid', () => {
    expect(isSessionExpired({ exp: 1787538036 }, nowMs)).toBe(false);
  });
});
