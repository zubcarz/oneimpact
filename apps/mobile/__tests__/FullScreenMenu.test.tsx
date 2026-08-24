import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import { AuthProvider } from '@/auth';
import { FullScreenMenu } from '@/components/layout/FullScreenMenu';
import { contactEmail, copyright, dashboardCta, joinCta, navItems } from '@/data/nav';

// jest.mock calls are hoisted above imports by babel-jest, so referencing the
// component imported above inside them is safe at module-evaluation time.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ArrowRight: () => <View testID="icon-arrow" />,
    X: () => <View testID="icon-x" />,
  };
});

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: () => <View testID="logo" /> };
});

jest.mock('expo-status-bar', () => {
  const { View } = jest.requireActual('react-native');
  return { StatusBar: () => <View testID="status-bar" /> };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

// `FullScreenMenu` reads `useAuth()` (D5, `20260823-mobile-register-payment-welcome.plan.md`,
// Fase 4): it lanza fuera de `AuthProvider` on purpose, so every render below
// wraps it. `AuthProvider`'s real bootstrap needs secure-store and a
// `GET /me` round trip -- overkill for a menu test -- so `@/auth` is mocked
// the same way `register-form.test.tsx`/`card-form.test.tsx` already mock
// it, with `AuthProvider` reduced to a passthrough that still renders
// children below `useAuth`, i.e. the wrapping this test needs is real, only
// the session bootstrap is faked.
let mockStatus: 'guest' | 'authed' = 'guest';

jest.mock('@/auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ status: mockStatus }),
}));

function renderMenu(visible = true) {
  return render(
    <AuthProvider>
      <FullScreenMenu visible={visible} onClose={jest.fn()} />
    </AuthProvider>,
  );
}

describe('FullScreenMenu', () => {
  beforeEach(() => {
    mockStatus = 'guest';
  });

  it('renders every nav destination, including the ones the footer used to own', () => {
    renderMenu();

    navItems.forEach((item) => {
      expect(screen.getByText(item.label)).toBeTruthy();
    });
    expect(screen.getByText('Proyectos')).toBeTruthy();
  });

  it('renders the join CTA, the contact email and the copyright for a guest', () => {
    renderMenu();

    expect(screen.getByText(joinCta.label)).toBeTruthy();
    expect(screen.queryByText(dashboardCta.label)).toBeNull();
    expect(screen.getByText(contactEmail)).toBeTruthy();
    expect(screen.getByText(copyright)).toBeTruthy();
  });

  it('renders nothing while closed', () => {
    renderMenu(false);

    expect(screen.queryByText(contactEmail)).toBeNull();
  });

  it('renders the dashboard CTA instead of the join CTA once there is a session', () => {
    mockStatus = 'authed';
    renderMenu();

    expect(screen.getByText(dashboardCta.label)).toBeTruthy();
    expect(screen.queryByText(joinCta.label)).toBeNull();
  });
});
