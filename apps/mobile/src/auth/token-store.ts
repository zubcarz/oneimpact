import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@oneimpact/shared';

// This is the ONLY module in apps/mobile allowed to import expo-secure-store.
// Everything else (the API client, the auth provider) goes through the
// functions below, so there is a single place that knows where a token
// physically lives.
const ACCESS_TOKEN_KEY = 'oneimpact.accessToken';
const REFRESH_TOKEN_KEY = 'oneimpact.refreshToken';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

// Minimal pub/sub so the API client (Phase 2, see src/api/client.ts) can
// announce that the session died without importing React or the future
// AuthProvider (Phase 4). This is what keeps this file free of a
// client <-> auth import cycle: the client depends on token-store, the
// provider depends on token-store, neither depends on the other.
type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  for (const listener of sessionExpiredListeners) {
    listener();
  }
}
