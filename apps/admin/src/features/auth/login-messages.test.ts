import { loginSchema } from '@oneimpact/shared';
import { describe, expect, it } from 'vitest';
import { LOGIN_FALLBACK_ERROR, loginErrorMessage, loginIssueMessage } from './login-messages';

describe('loginErrorMessage', () => {
  it('uses the Spanish message written by the login route handler', () => {
    expect(loginErrorMessage({ message: 'Correo o contraseña incorrectos.' })).toBe(
      'Correo o contraseña incorrectos.',
    );
  });

  it('falls back when the body has no usable message', () => {
    expect(loginErrorMessage(null)).toBe(LOGIN_FALLBACK_ERROR);
    expect(loginErrorMessage(undefined)).toBe(LOGIN_FALLBACK_ERROR);
    expect(loginErrorMessage({})).toBe(LOGIN_FALLBACK_ERROR);
    expect(loginErrorMessage({ message: '   ' })).toBe(LOGIN_FALLBACK_ERROR);
    expect(loginErrorMessage({ message: 401 })).toBe(LOGIN_FALLBACK_ERROR);
    expect(loginErrorMessage('<html>502 Bad Gateway</html>')).toBe(LOGIN_FALLBACK_ERROR);
  });
});

describe('loginIssueMessage', () => {
  it('answers a Spanish message per field of loginSchema', () => {
    expect(loginIssueMessage({ code: 'invalid_format', path: ['email'] })).toBe(
      'Introduce un correo electrónico válido.',
    );
    expect(loginIssueMessage({ code: 'too_small', path: ['password'] })).toBe(
      'Introduce tu contraseña.',
    );
  });

  it('answers a generic message for an issue with no field or an unknown one', () => {
    expect(loginIssueMessage({ code: 'invalid_type' })).toBe('Revisa los datos del formulario.');
    expect(loginIssueMessage({ code: 'unrecognized_keys', path: ['role'] })).toBe(
      'Revisa los datos del formulario.',
    );
  });

  // The point of the map: the form must not show the English defaults of zod
  // ("Invalid email address"), and it must not redefine loginSchema to avoid it.
  it('replaces the untranslated defaults of loginSchema when used as its error map', () => {
    const result = loginSchema.safeParse(
      { email: 'not-an-email', password: '' },
      { error: loginIssueMessage },
    );

    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => [issue.path[0], issue.message]);
    expect(messages).toEqual([
      ['email', 'Introduce un correo electrónico válido.'],
      ['password', 'Introduce tu contraseña.'],
    ]);
  });
});
