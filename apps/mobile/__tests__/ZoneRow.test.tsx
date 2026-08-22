import { fireEvent, render, screen } from '@testing-library/react-native';
import { ZoneRow } from '@/components/ui/ZoneRow';

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { ArrowRight: () => <View testID="icon-arrow-right" /> };
});

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: () => <View testID="image" /> };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: () => <View testID="gradient" /> };
});

describe('ZoneRow', () => {
  const zone = {
    slug: 'amazonia',
    name: 'Amazonia',
    description: 'Restauracion de bosque nativo en la cuenca del Amazonas.',
    image: 1,
  };

  it('renders the zone name and description', () => {
    render(<ZoneRow {...zone} />);

    expect(screen.getByText(zone.name)).toBeTruthy();
    expect(screen.getByText(zone.description)).toBeTruthy();
  });

  it('exposes an accessible button role', () => {
    render(<ZoneRow {...zone} />);

    expect(screen.getByRole('button', { name: zone.name })).toBeTruthy();
  });

  it('calls onPress with the zone slug when pressed', () => {
    const onPress = jest.fn();
    render(<ZoneRow {...zone} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: zone.name }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(zone.slug);
  });
});
