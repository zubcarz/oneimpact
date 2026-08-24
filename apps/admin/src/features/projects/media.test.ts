import { describe, expect, it } from 'vitest';
import { isRenderableMediaUrl } from './media';

describe('isRenderableMediaUrl', () => {
  it('accepts an absolute http(s) url', () => {
    expect(isRenderableMediaUrl('https://cdn.example.com/uploads/foto.jpg')).toBe(true);
    expect(isRenderableMediaUrl('http://localhost:9000/media/foto.jpg')).toBe(true);
  });

  it('rejects the relative storage key the seed writes', () => {
    // `apps/api/prisma/seed.ts` stores keys like this one, and so would an
    // upload flow that ever sent `key` instead of a full URL.
    expect(isRenderableMediaUrl('updates/reforestacion-1.jpg')).toBe(false);
  });

  it('rejects the simulated upload url even though `z.url()` accepts it', () => {
    // Measured in phase 0: this string is VALID for `z.url()`, so the contract
    // does not stop it. Nothing can load it, so the panel does.
    expect(isRenderableMediaUrl('local-simulated://uploads/uploads/abc-foto.jpg')).toBe(false);
  });

  it('rejects schemes that do not belong in an image src', () => {
    expect(isRenderableMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isRenderableMediaUrl('data:image/png;base64,AAAA')).toBe(false);
  });

  it('treats a missing or blank value as nothing to render', () => {
    expect(isRenderableMediaUrl(undefined)).toBe(false);
    expect(isRenderableMediaUrl('')).toBe(false);
    expect(isRenderableMediaUrl('   ')).toBe(false);
  });
});
