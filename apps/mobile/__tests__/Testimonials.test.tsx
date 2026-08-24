import { fireEvent, render, screen } from '@testing-library/react-native';
import { Testimonials } from '@/features/home/Testimonials';
import { testimonials } from '@/data/home';

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Play: () => <View testID="icon-play" />,
    ArrowRight: () => <View testID="icon-arrow-right" />,
  };
});

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

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

const mockSelectionAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-haptics', () => ({
  selectionAsync: (...args: unknown[]) => mockSelectionAsync(...args),
}));

describe('Testimonials', () => {
  beforeEach(() => {
    mockSelectionAsync.mockClear();
  });

  it('renders the first testimonial by default', () => {
    render(<Testimonials />);

    expect(screen.getAllByText(testimonials[0].name).length).toBeGreaterThan(0);
    expect(screen.getByTestId('testimonial-quote').props.children).toBe(testimonials[0].quote);
  });

  it('switches the active testimonial when an avatar is pressed', () => {
    render(<Testimonials />);

    fireEvent.press(screen.getByLabelText(testimonials[1].name));

    expect(screen.getAllByText(testimonials[1].name).length).toBeGreaterThan(0);
    expect(screen.getByTestId('testimonial-quote').props.children).toBe(testimonials[1].quote);
    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
  });
});
