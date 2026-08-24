import { fireEvent, render, screen } from '@testing-library/react-native';
import { FollowButton } from '@/components/ui/FollowButton';

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { Check: () => <View testID="icon-check" /> };
});

jest.mock('expo-haptics', () => ({
  // Devuelve una promesa como la API real: el componente encadena `.catch`.
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

describe('FollowButton', () => {
  it('shows "Siguiendo" and selected=true when following', () => {
    render(<FollowButton following onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Siguiendo' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState.selected).toBe(true);
  });

  it('shows "Seguir este proyecto" and selected=false when not following', () => {
    render(<FollowButton following={false} onPress={jest.fn()} />);

    const button = screen.getByRole('button', { name: 'Seguir este proyecto' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState.selected).toBe(false);
  });

  it('calls onPress when enabled', () => {
    const onPress = jest.fn();
    render(<FollowButton following={false} onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Seguir este proyecto' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<FollowButton following={false} onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Seguir este proyecto' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
