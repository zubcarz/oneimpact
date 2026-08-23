import { useMutation } from '@tanstack/react-query';
import type { LoginInput, RegisterInput } from '@oneimpact/shared';
import { callApi } from '@/api/client';

// These mutations only perform the network call and resolve with the
// `AuthResponse` (`{ user, tokens }`). Persisting the tokens to secure
// storage and updating session state is the AuthProvider's job (Phase 4) --
// keeping that split means this hook stays reusable outside of a signed-in
// context (e.g. a future "sign up and preview, sign in later" flow).
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => callApi((api) => api.auth.register(input)),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => callApi((api) => api.auth.login(input)),
  });
}
