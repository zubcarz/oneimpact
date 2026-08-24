import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@oneimpact/shared';

// This is the ONLY module in apps/mobile allowed to import expo-secure-store.
// Everything else (the API client, the auth provider) goes through the
// functions below, so there is a single place that knows where a token
// physically lives.
const ACCESS_TOKEN_KEY = 'oneimpact.accessToken';
const REFRESH_TOKEN_KEY = 'oneimpact.refreshToken';

/**
 * Where a token physically lives, per platform.
 *
 * `expo-secure-store` has no browser implementation: on web its native module
 * resolves to a stub and the first call dies with
 * "ExpoSecureStore.default.getValueWithKeyAsync is not a function", which took
 * down the whole app at `AuthProvider` bootstrap. The target platform of the
 * product is native (Keychain / Keystore, per rule 20), so web gets a fallback
 * whose only job is to let the app run in a browser for a quick look.
 *
 * The fallback is **in memory on purpose**. `localStorage` would survive a
 * reload, which is exactly why it is not used: a JWT in `localStorage` is
 * readable by any script on the page, and the repo forbids that for the admin
 * (rule 40) -- there is no reason to be laxer here. The cost is that a browser
 * reload signs you out, and that is the correct trade-off for a preview target.
 */
interface TokenBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

function createMemoryBackend(): TokenBackend {
  const values = new Map<string, string>();
  return {
    getItemAsync: (key) => Promise.resolve(values.get(key) ?? null),
    setItemAsync: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
    deleteItemAsync: (key) => {
      values.delete(key);
      return Promise.resolve();
    },
  };
}

const backend: TokenBackend = Platform.OS === 'web' ? createMemoryBackend() : SecureStore;

export async function getAccessToken(): Promise<string | null> {
  return backend.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return backend.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    backend.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    backend.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    backend.deleteItemAsync(ACCESS_TOKEN_KEY),
    backend.deleteItemAsync(REFRESH_TOKEN_KEY),
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
