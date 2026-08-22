import { render, screen } from '@testing-library/react-native';
import { Footer } from '@/components/layout/Footer';
import { copyright, footerMenu } from '@/data/nav';

// jest.mock calls are hoisted above imports by babel-jest, so referencing
// `Footer` (imported above) inside them is safe at module-evaluation time.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { X: () => <View testID="icon-x" /> };
});

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: () => <View testID="logo" /> };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

describe('Footer', () => {
  it('renders the copyright line', () => {
    render(<Footer />);

    expect(screen.getByText(copyright)).toBeTruthy();
  });

  it('renders every footer menu link', () => {
    render(<Footer />);

    footerMenu.forEach((item) => {
      expect(screen.getByText(item.label)).toBeTruthy();
    });
  });
});
