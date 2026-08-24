/**
 * The token backend is chosen at import time from `Platform.OS`, so each case
 * needs its own module registry: `jest.resetModules()` plus a `require()` inside
 * the test, not a top-level `import`.
 */
const mockSecureStore = {
  getItemAsync: jest.fn<Promise<string | null>, [string]>(),
  setItemAsync: jest.fn<Promise<void>, [string, string]>(),
  deleteItemAsync: jest.fn<Promise<void>, [string]>(),
};

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

function loadStoreFor(platform: 'ios' | 'android' | 'web') {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: platform } }));
  jest.doMock('expo-secure-store', () => mockSecureStore);
  return require('../src/auth/token-store') as typeof import('../src/auth/token-store');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSecureStore.getItemAsync.mockResolvedValue(null);
  mockSecureStore.setItemAsync.mockResolvedValue(undefined);
  mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
});

describe('token-store on native', () => {
  it('reads and writes through expo-secure-store', async () => {
    const store = loadStoreFor('ios');

    await store.saveTokens(tokens);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('oneimpact.accessToken', 'access-1');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('oneimpact.refreshToken', 'refresh-1');

    mockSecureStore.getItemAsync.mockResolvedValueOnce('access-1');
    expect(await store.getAccessToken()).toBe('access-1');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('oneimpact.accessToken');

    await store.clearTokens();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('oneimpact.accessToken');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('oneimpact.refreshToken');
  });
});

describe('token-store on web', () => {
  // Regression: expo-secure-store has no browser implementation, so reaching it
  // from web killed the app at AuthProvider bootstrap with
  // "ExpoSecureStore.default.getValueWithKeyAsync is not a function".
  it('never touches expo-secure-store', async () => {
    const store = loadStoreFor('web');

    await store.saveTokens(tokens);
    await store.getAccessToken();
    await store.getRefreshToken();
    await store.clearTokens();

    expect(mockSecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('keeps the session in memory for the life of the page', async () => {
    const store = loadStoreFor('web');

    expect(await store.getAccessToken()).toBeNull();

    await store.saveTokens(tokens);
    expect(await store.getAccessToken()).toBe('access-1');
    expect(await store.getRefreshToken()).toBe('refresh-1');

    await store.clearTokens();
    expect(await store.getAccessToken()).toBeNull();
    expect(await store.getRefreshToken()).toBeNull();
  });

  // The point of not using localStorage: a reload must not hand the JWT back.
  it('starts empty in a fresh module registry, the way a reload does', async () => {
    const first = loadStoreFor('web');
    await first.saveTokens(tokens);
    expect(await first.getAccessToken()).toBe('access-1');

    const afterReload = loadStoreFor('web');
    expect(await afterReload.getAccessToken()).toBeNull();
  });
});
