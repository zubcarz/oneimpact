import { describe, expect, it } from 'vitest';
import {
  allowsResponseBody,
  buildForwardedRequestHeaders,
  buildForwardedResponseHeaders,
  buildTargetUrl,
  isSafePathSegment,
} from './gateway';

const API_URL = 'http://localhost:5000';

describe('buildTargetUrl', () => {
  it('composes the API url from the catch-all segments', () => {
    // `API_PATHS` starts with `/v1`, so the browser asks for
    // `/api/gateway/v1/projects` and the segments arrive already split.
    expect(buildTargetUrl(API_URL, ['v1', 'projects'])).toBe('http://localhost:5000/v1/projects');
  });

  it('keeps the query string of the original request', () => {
    expect(buildTargetUrl(API_URL, ['v1', 'projects'], '?zone=amazonas&page=2')).toBe(
      'http://localhost:5000/v1/projects?zone=amazonas&page=2',
    );
  });

  it('handles nested resource paths', () => {
    expect(buildTargetUrl(API_URL, ['v1', 'projects', 'cmt4s8', 'updates'])).toBe(
      'http://localhost:5000/v1/projects/cmt4s8/updates',
    );
  });

  it('never doubles the slash when the base url has a trailing one', () => {
    expect(buildTargetUrl('http://localhost:5000/', ['v1', 'plans'])).toBe(
      'http://localhost:5000/v1/plans',
    );
  });

  it('rejects a traversal segment', () => {
    expect(buildTargetUrl(API_URL, ['v1', '..', '..', 'etc'])).toBeNull();
    expect(buildTargetUrl(API_URL, ['v1', '.'])).toBeNull();
  });

  it('rejects a segment carrying a scheme', () => {
    expect(buildTargetUrl(API_URL, ['https://evil.example.com'])).toBeNull();
    expect(buildTargetUrl(API_URL, ['v1', 'projects://x'])).toBeNull();
  });

  it('rejects a segment that tries to open a new path level', () => {
    expect(buildTargetUrl(API_URL, ['v1', '/admin'])).toBeNull();
    expect(buildTargetUrl(API_URL, ['v1', 'a/b'])).toBeNull();
    expect(buildTargetUrl(API_URL, ['v1', 'a\b'])).toBeNull();
  });

  it('rejects an empty segment list', () => {
    expect(buildTargetUrl(API_URL, [])).toBeNull();
  });
});

describe('isSafePathSegment', () => {
  it('accepts the shapes the REST contract uses', () => {
    expect(isSafePathSegment('v1')).toBe(true);
    expect(isSafePathSegment('cmt4s8snr0000kpw4qxz96ah7')).toBe(true);
    expect(isSafePathSegment('valle-del-cauca')).toBe(true);
  });

  it('rejects empty, traversal and control characters', () => {
    expect(isSafePathSegment('')).toBe(false);
    expect(isSafePathSegment('..')).toBe(false);
    expect(isSafePathSegment('a b')).toBe(false);
    expect(isSafePathSegment('a\nb')).toBe(false);
    expect(isSafePathSegment('a?b=1')).toBe(false);
  });
});

describe('buildForwardedRequestHeaders', () => {
  it('injects the bearer token and keeps the content type', () => {
    const source = new Headers({ 'content-type': 'application/json', accept: 'application/json' });
    const headers = buildForwardedRequestHeaders(source, 'token-abc');

    expect(headers.get('authorization')).toBe('Bearer token-abc');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('accept')).toBe('application/json');
  });

  it('never forwards the browser cookie nor hop-by-hop headers', () => {
    const source = new Headers({
      cookie: 'oi_access=leaked; oi_refresh=leaked',
      host: 'localhost:5001',
      connection: 'keep-alive',
      'transfer-encoding': 'chunked',
      'content-length': '12',
    });
    const headers = buildForwardedRequestHeaders(source, 'token-abc');

    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('host')).toBeNull();
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('transfer-encoding')).toBeNull();
    expect(headers.get('content-length')).toBeNull();
  });

  it('ignores an incoming authorization header instead of trusting it', () => {
    const source = new Headers({ authorization: 'Bearer forged' });
    expect(buildForwardedRequestHeaders(source, 'token-abc').get('authorization')).toBe(
      'Bearer token-abc',
    );
  });
});

describe('buildForwardedResponseHeaders', () => {
  it('preserves the content type of the API response', () => {
    const source = new Headers({ 'content-type': 'application/json; charset=utf-8' });
    expect(buildForwardedResponseHeaders(source).get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
  });

  it('drops set-cookie and the encoding headers of the API response', () => {
    const source = new Headers({
      'set-cookie': 'session=from-api',
      'content-encoding': 'gzip',
      'content-length': '42',
    });
    const headers = buildForwardedResponseHeaders(source);

    expect(headers.get('set-cookie')).toBeNull();
    expect(headers.get('content-encoding')).toBeNull();
    expect(headers.get('content-length')).toBeNull();
  });
});

describe('allowsResponseBody', () => {
  it('is false for the statuses whose response must be empty', () => {
    expect(allowsResponseBody(204)).toBe(false);
    expect(allowsResponseBody(304)).toBe(false);
  });

  it('is true for the statuses the panel actually renders', () => {
    expect(allowsResponseBody(200)).toBe(true);
    expect(allowsResponseBody(401)).toBe(true);
    expect(allowsResponseBody(422)).toBe(true);
  });
});
