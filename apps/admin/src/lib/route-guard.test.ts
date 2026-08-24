import { describe, expect, it } from 'vitest';
import { decideRoute } from './route-guard';

/** Encodes a string as base64url, the same way a JWT segment is encoded. */
function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const NOW_MS = 1787538000000;
const NOW_SECONDS = NOW_MS / 1000;

/** Token with a real base64url payload and a dummy signature. */
function makeToken(claims: Record<string, unknown>): string {
  return [
    toBase64Url('{"alg":"HS256","typ":"JWT"}'),
    toBase64Url(JSON.stringify(claims)),
    'signature',
  ].join('.');
}

const adminToken = makeToken({
  sub: 'cmt4s8snr0000kpw4qxz96ah7',
  email: 'admin@oneimpact.org',
  role: 'ADMIN',
  exp: NOW_SECONDS + 600,
});

const userToken = makeToken({
  sub: 'cmt4s8snr0001kpw4qxz96ah8',
  email: 'ana@oneimpact.org',
  role: 'USER',
  exp: NOW_SECONDS + 600,
});

const expiredAdminToken = makeToken({
  sub: 'cmt4s8snr0000kpw4qxz96ah7',
  email: 'admin@oneimpact.org',
  role: 'ADMIN',
  exp: NOW_SECONDS - 1,
});

describe('decideRoute', () => {
  it.each([
    '/login',
    '/403',
    '/api/auth/login',
    '/api/auth/logout',
    '/_next/static/chunks/main.js',
    '/favicon.ico',
    '/logo_blanco.svg',
  ])('lets %s through without a session', (pathname) => {
    expect(decideRoute({ pathname, token: undefined, nowMs: NOW_MS })).toBe('allow');
  });

  it('lets the gateway answer 401 itself instead of redirecting it', () => {
    expect(
      decideRoute({ pathname: '/api/gateway/v1/projects', token: undefined, nowMs: NOW_MS }),
    ).toBe('allow');
  });

  it('redirects to login when there is no cookie', () => {
    expect(decideRoute({ pathname: '/projects', token: undefined, nowMs: NOW_MS })).toBe(
      'redirect-login',
    );
  });

  it('redirects to login when the token cannot be decoded', () => {
    expect(decideRoute({ pathname: '/projects', token: 'not-a-jwt', nowMs: NOW_MS })).toBe(
      'redirect-login',
    );
  });

  it('redirects to login when the token is expired', () => {
    expect(decideRoute({ pathname: '/projects', token: expiredAdminToken, nowMs: NOW_MS })).toBe(
      'redirect-login',
    );
  });

  it('rewrites to 403 for a valid session whose role is not ADMIN', () => {
    expect(decideRoute({ pathname: '/projects', token: userToken, nowMs: NOW_MS })).toBe(
      'rewrite-403',
    );
  });

  it('does not send a non admin to login, which would loop', () => {
    expect(decideRoute({ pathname: '/dashboard', token: userToken, nowMs: NOW_MS })).not.toBe(
      'redirect-login',
    );
  });

  it('allows an admin session', () => {
    expect(decideRoute({ pathname: '/projects', token: adminToken, nowMs: NOW_MS })).toBe('allow');
  });

  it('guards the root path like any other screen', () => {
    expect(decideRoute({ pathname: '/', token: undefined, nowMs: NOW_MS })).toBe('redirect-login');
    expect(decideRoute({ pathname: '/', token: adminToken, nowMs: NOW_MS })).toBe('allow');
  });
});
