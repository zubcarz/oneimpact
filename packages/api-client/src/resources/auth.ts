import { API_PATHS } from '@oneimpact/shared';
import type { AuthResponse, AuthTokens, LoginInput, RegisterInput } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createAuthResource(request: RequestFn) {
  return {
    register: (input: RegisterInput) =>
      request<AuthResponse>(API_PATHS.auth.register, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    login: (input: LoginInput) =>
      request<AuthResponse>(API_PATHS.auth.login, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    refresh: (input: { refreshToken: string }) =>
      request<AuthTokens>(API_PATHS.auth.refresh, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // Logout requires an access token (not @Public()) and needs the refresh
    // token in the body so the API can revoke that specific session.
    logout: (input: { refreshToken: string }) =>
      request<void>(API_PATHS.auth.logout, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  };
}
