import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import LoginScreen from '@/../app/(auth)/login';

let mockParams: { returnTo?: string } = {};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/features/auth/LoginForm', () => {
  const { View } = jest.requireActual('react-native');
  return { LoginForm: () => <View testID="login-form" /> };
});

// Mismo stub que `FullScreenMenu.test.tsx:28` y `zone-detail.test.tsx:40`:
// `AuthScreenHeader` lee `useSafeAreaInsets`, que sin provider lanza.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { ChevronLeft: () => <View testID="icon-chevron-left" /> };
});

describe('LoginScreen', () => {
  beforeEach(() => {
    mockParams = {};
    (router.replace as jest.Mock).mockClear();
    (router.back as jest.Mock).mockClear();
  });

  /**
   * The regression this pins: `useRequireAuth` throws a guest out of `(app)`
   * with `replace`, which destroys the entry it came from. `router.back()` then
   * either had nowhere to go or returned into `(app)`, which redirected here
   * again -- the login had no exit.
   */
  it('always leaves to the public home instead of walking history back', () => {
    mockParams = { returnTo: '/(app)/dashboard' };
    render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText('Volver'));

    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('offers the same exit when reached by choice, with no returnTo at all', () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText('Volver'));

    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
