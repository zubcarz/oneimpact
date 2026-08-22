import { describe, expect, it } from 'vitest';
import {
  authResponseSchema,
  refreshTokenSchema,
  updateProfileSchema,
  updateUserRoleSchema,
} from './auth';

describe('updateProfileSchema', () => {
  it('rejects a payload that tries to smuggle a role field', () => {
    const result = updateProfileSchema.safeParse({ name: 'Carlos', role: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = updateProfileSchema.safeParse({ name: 'C' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid payload with only name', () => {
    const result = updateProfileSchema.safeParse({ name: 'Carlos' });
    expect(result.success).toBe(true);
  });
});

describe('refreshTokenSchema', () => {
  it('rejects an empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });

  it('accepts a non-empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'a-valid-token' });
    expect(result.success).toBe(true);
  });
});

describe('authResponseSchema', () => {
  it('accepts a well-formed auth response', () => {
    const result = authResponseSchema.safeParse({
      user: { id: '1', email: 'a@b.com', name: 'Carlos', role: 'USER' },
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a response missing tokens', () => {
    const result = authResponseSchema.safeParse({
      user: { id: '1', email: 'a@b.com', name: 'Carlos', role: 'USER' },
    });
    expect(result.success).toBe(false);
  });
});

describe('updateUserRoleSchema', () => {
  it('rejects an invented role', () => {
    const result = updateUserRoleSchema.safeParse({ role: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid role', () => {
    const result = updateUserRoleSchema.safeParse({ role: 'ADMIN' });
    expect(result.success).toBe(true);
  });
});
