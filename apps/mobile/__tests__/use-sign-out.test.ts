import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useSignOut } from '@/auth/useSignOut';

const mockSignOut = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@/auth/useAuth', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

describe('useSignOut', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    (router.replace as jest.Mock).mockClear();
  });

  /**
   * The whole point of the hook. Clearing the session while a screen of `(app)`
   * is still mounted makes its guard (`useRequireAuth`) replace into the login
   * form, and since that replace destroys the entry it came from, the login has
   * no way back: signing out ended in a screen with no exit.
   *
   * Asserting the ORDER, not just that both ran, is what pins the fix -- both
   * calls happen either way.
   */
  it('navigates out of the protected group before clearing the session', () => {
    const calls: string[] = [];
    (router.replace as jest.Mock).mockImplementation(() => calls.push('replace'));
    mockSignOut.mockImplementation(() => {
      calls.push('signOut');
      return Promise.resolve();
    });

    const { result } = renderHook(() => useSignOut());
    result.current();

    expect(calls).toEqual(['replace', 'signOut']);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('sends the user to the public home, never to a protected route', () => {
    const { result } = renderHook(() => useSignOut());
    result.current();

    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
