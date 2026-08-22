import { act, render, screen } from '@testing-library/react-native';
import { StatsBanner } from '@/features/home/StatsBanner';
import { stats } from '@/data/home';

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { ArrowRight: () => <View testID="icon-arrow-right" /> };
});

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: () => <View testID="image" /> };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

describe('StatsBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the lead and caption copy', () => {
    render(<StatsBanner />);

    expect(screen.getByText(stats.lead)).toBeTruthy();
    expect(screen.getByText(stats.caption)).toBeTruthy();
  });

  it('animates the counter up to the final display value', () => {
    render(<StatsBanner />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId('stats-counter').props.children).toBe(stats.display);
  });
});
