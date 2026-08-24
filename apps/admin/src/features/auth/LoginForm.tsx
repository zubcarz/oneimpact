'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@oneimpact/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { LOGIN_FALLBACK_ERROR, loginErrorMessage, loginIssueMessage } from './login-messages';

/**
 * Credentials form of the panel. The only client component of the login screen.
 *
 * It validates with `loginSchema` from `@oneimpact/shared` -- the same schema the
 * route handler and the API use -- so a rule can only be written once. The
 * per-parse error map only translates the defaults zod would answer in English;
 * see `loginIssueMessage`.
 */

/**
 * Where a successful login lands, **whatever the role is**.
 *
 * The handler opens the session for a `USER` too and answers `{ role }`, but the
 * decision does not belong here: `src/proxy.ts` rewrites to `/403` when the role
 * is not `ADMIN`. Branching on the role in the client would give a second,
 * divergent copy of the authorization rule and would leave the 403 flow
 * unreachable from the UI, which is exactly what the Playwright spec has to
 * exercise. Hence no comparison against `Role` here.
 */
const AFTER_LOGIN_PATH = '/projects';

const EMAIL_ERROR_ID = 'email-error';
const PASSWORD_ERROR_ID = 'password-error';
const FORM_ERROR_ID = 'login-error';

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema, { error: loginIssueMessage }),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        // The handler always answers a Spanish `{ message }`; a body that is not
        // JSON (a proxy error page, for instance) degrades to the generic line.
        setFormError(loginErrorMessage(await response.json().catch(() => null)));
        return;
      }

      router.replace(AFTER_LOGIN_PATH);
      // The client router cache can still hold the answer /projects gave before
      // the session existed -- typically the redirect to /login that sent the
      // admin here. `refresh()` drops that cache so the navigation is resolved
      // by the proxy with the cookies that were just written, and so the Server
      // Components render with them. PENDING: confirm in the browser.
      router.refresh();
    } catch {
      // Network failure or an aborted request: nothing of the error is shown.
      setFormError(LOGIN_FALLBACK_ERROR);
    }
  });

  return (
    // `noValidate` hands validation to zod: without it the browser blocks the
    // submit on `type="email"` first and shows a message in its own locale,
    // outside the design system and impossible to assert.
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@oneimpact.com"
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email !== undefined ? EMAIL_ERROR_ID : undefined}
          {...register('email')}
        />
        <FieldError id={EMAIL_ERROR_ID}>{errors.email?.message}</FieldError>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password !== undefined ? PASSWORD_ERROR_ID : undefined}
          {...register('password')}
        />
        <FieldError id={PASSWORD_ERROR_ID}>{errors.password?.message}</FieldError>
      </div>

      <FieldError id={FORM_ERROR_ID} className="rounded-2xl bg-red-50 px-4 py-3">
        {formError}
      </FieldError>

      {/*
        `type="submit"` is explicit because `Button` defaults to `"button"`. It is
        what makes Enter inside a field send the form, and `disabled` while
        submitting is what keeps a double submit from opening two sessions.
      */}
      <Button type="submit" variant="dark" size="lg" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
