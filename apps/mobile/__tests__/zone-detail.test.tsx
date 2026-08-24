import { fireEvent, render, screen } from '@testing-library/react-native';
import { ApiError } from '@oneimpact/api-client';
import type { Zone, Project } from '@oneimpact/shared';
import ZoneDetailScreen from '../app/zone/[slug]';
import { zoneDetail } from '@/data/zones';
import { useZone } from '@/api/hooks';
import { seedProjectsFixture, seedZonesFixture } from '@/api/msw/seed-fixtures';

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

// The screen only talks to the data layer through `useZone`; mocking the hook
// (instead of `@/data/zones`) is what the plan asks for, and it sidesteps the
// nested-React-copy crash any test that mounts a real `QueryClientProvider`
// hits in this workspace (see the phase's environment note).
jest.mock('@/api/hooks', () => ({
  useZone: jest.fn(),
}));

const mockedUseZone = useZone as jest.MockedFunction<typeof useZone>;

type ZoneDetailData = Zone & { projects: Project[] };

function zoneFixture(slug: string): ZoneDetailData {
  const zone = seedZonesFixture.find((item) => item.slug === slug);
  if (!zone) {
    throw new Error(`Fixture setup error: unknown zone slug "${slug}"`);
  }
  const projects = seedProjectsFixture.filter((project) => project.zoneId === zone.id);
  return { ...zone, projects };
}

// `useZone`'s return type is a full `UseQueryResult`; tests only read the
// fields the screen actually branches on, cast through `unknown` to avoid
// hand-rolling every TanStack Query field.
function mockUseZone(overrides: {
  data?: ZoneDetailData;
  isPending?: boolean;
  isError?: boolean;
  error?: unknown;
  refetch?: jest.Mock;
}) {
  mockedUseZone.mockReturnValue({
    data: overrides.data,
    isPending: overrides.isPending ?? false,
    isError: overrides.isError ?? false,
    error: overrides.error ?? null,
    refetch: overrides.refetch ?? jest.fn(),
  } as unknown as ReturnType<typeof useZone>);
}

describe('ZoneDetailScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the advances of the zone when it has published projects', () => {
    mockSlug = 'amazonia';
    const zone = zoneFixture('amazonia');
    mockUseZone({ data: zone });

    render(<ZoneDetailScreen />);

    expect(zone.projects.length).toBeGreaterThan(0);
    zone.projects.forEach((project) => {
      expect(screen.getByText(project.title)).toBeTruthy();
    });
    expect(screen.getByText(zoneDetail.advancesTitle)).toBeTruthy();
  });

  it('renders the empty state and keeps the CTA for a zone without advances', () => {
    mockSlug = 'patagonia';
    const zone = zoneFixture('patagonia');
    mockUseZone({ data: zone });

    render(<ZoneDetailScreen />);

    expect(zone.projects).toHaveLength(0);
    expect(screen.getByText(zoneDetail.emptyTitle)).toBeTruthy();
    expect(screen.getByText(zoneDetail.emptyBody)).toBeTruthy();
    expect(screen.queryByText(zoneDetail.advancesTitle)).toBeNull();
    expect(screen.getByRole('button', { name: zoneDetail.cta })).toBeTruthy();
  });

  it('renders the not-found state for the 404 the server raises on an unknown slug', () => {
    mockSlug = 'noexiste';
    mockUseZone({
      isError: true,
      error: new ApiError(404, 'Zone "noexiste" was not found', {
        statusCode: 404,
        code: 'ZONE_NOT_FOUND',
        message: 'Zone "noexiste" was not found',
      }),
    });

    render(<ZoneDetailScreen />);

    expect(screen.getByText(zoneDetail.notFoundTitle)).toBeTruthy();
  });

  it('shows the loading skeleton while the zone request is pending', () => {
    mockSlug = 'amazonia';
    mockUseZone({ isPending: true });

    render(<ZoneDetailScreen />);

    expect(screen.getByTestId('zones-skeleton')).toBeTruthy();
    expect(screen.queryByText(zoneDetail.notFoundTitle)).toBeNull();
  });

  it('shows ZonesError with a retry that refetches on a network error', () => {
    mockSlug = 'amazonia';
    const refetch = jest.fn();
    mockUseZone({
      isError: true,
      error: new ApiError(0, 'Network request failed'),
      refetch,
    });

    render(<ZoneDetailScreen />);

    expect(screen.getByTestId('zones-error')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
