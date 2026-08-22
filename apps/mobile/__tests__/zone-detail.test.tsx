import { render, screen } from '@testing-library/react-native';
import ZoneDetailScreen from '../app/zone/[slug]';
import { advancesByZone, zoneDetail } from '@/data/zones';

let mockSlug = 'amazonia';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ slug: mockSlug }),
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: () => <View testID="image" /> };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: () => <View testID="gradient" /> };
});

jest.mock('expo-blur', () => {
  const { View } = jest.requireActual('react-native');
  return { BlurView: () => <View testID="blur" /> };
});

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ChevronLeft: () => <View testID="icon-chevron-left" />,
    X: () => <View testID="icon-x" />,
    ArrowRight: () => <View testID="icon-arrow-right" />,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const animationBuilder = { duration: () => animationBuilder };
  return {
    __esModule: true,
    default: { View },
    FadeIn: animationBuilder,
    FadeOut: animationBuilder,
  };
});

describe('ZoneDetailScreen', () => {
  it('renders the advances of the zone when it has published projects', () => {
    mockSlug = 'amazonia';
    render(<ZoneDetailScreen />);

    const zoneAdvances = advancesByZone('amazonia');
    expect(zoneAdvances.length).toBeGreaterThan(0);
    zoneAdvances.forEach((advance) => {
      expect(screen.getByText(advance.title)).toBeTruthy();
    });
    expect(screen.getByText(zoneDetail.advancesTitle)).toBeTruthy();
  });

  it('renders the empty state and keeps the CTA for a zone without advances', () => {
    mockSlug = 'patagonia';
    render(<ZoneDetailScreen />);

    expect(screen.getByText(zoneDetail.emptyTitle)).toBeTruthy();
    expect(screen.getByText(zoneDetail.emptyBody)).toBeTruthy();
    expect(screen.queryByText(zoneDetail.advancesTitle)).toBeNull();
    expect(screen.getByRole('button', { name: zoneDetail.cta })).toBeTruthy();
  });

  it('renders the not-found state for an invalid slug', () => {
    mockSlug = 'noexiste';
    render(<ZoneDetailScreen />);

    expect(screen.getByText(zoneDetail.notFoundTitle)).toBeTruthy();
  });
});
