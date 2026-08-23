import { render, screen } from '@testing-library/react-native';
import { FullScreenMenu } from '@/components/layout/FullScreenMenu';
import { contactEmail, copyright, joinCta, navItems } from '@/data/nav';

// jest.mock calls are hoisted above imports by babel-jest, so referencing the
// component imported above inside them is safe at module-evaluation time.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ArrowRight: () => <View testID="icon-arrow" />,
    X: () => <View testID="icon-x" />,
  };
});

// Reanimated arrastra worklets nativos que no existen en jest-expo: el menu solo
// usa Animated.View + FadeIn/FadeOut, asi que basta un View y descriptores vacios.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const animation = { duration: () => ({}) };
  return { __esModule: true, default: { View }, FadeIn: animation, FadeOut: animation };
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

describe('FullScreenMenu', () => {
  it('renders every nav destination, including the ones the footer used to own', () => {
    render(<FullScreenMenu visible onClose={jest.fn()} />);

    navItems.forEach((item) => {
      expect(screen.getByText(item.label)).toBeTruthy();
    });
    expect(screen.getByText('Proyectos')).toBeTruthy();
  });

  it('renders the join CTA, the contact email and the copyright', () => {
    render(<FullScreenMenu visible onClose={jest.fn()} />);

    expect(screen.getByText(joinCta.label)).toBeTruthy();
    expect(screen.getByText(contactEmail)).toBeTruthy();
    expect(screen.getByText(copyright)).toBeTruthy();
  });

  it('renders nothing while closed', () => {
    render(<FullScreenMenu visible={false} onClose={jest.fn()} />);

    expect(screen.queryByText(contactEmail)).toBeNull();
  });
});
