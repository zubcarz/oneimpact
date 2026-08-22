import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders the label', () => {
    render(<Button label="Quiero hacer parte" />);

    expect(screen.getByText('Quiero hacer parte')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button label="Unete" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Unete' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessible button role', () => {
    render(<Button label="Explorar zonas" accessibilityLabel="Explorar zonas de impacto" />);

    expect(screen.getByRole('button', { name: 'Explorar zonas de impacto' })).toBeTruthy();
  });

  it('renders the accent variant', () => {
    render(<Button label="Quiero unirme" variant="accent" />);

    expect(screen.getByText('Quiero unirme')).toBeTruthy();
  });

  it('renders the dark variant', () => {
    render(<Button label="Comenzar mi travesia" variant="dark" size="lg" />);

    expect(screen.getByText('Comenzar mi travesia')).toBeTruthy();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Deshabilitado" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Deshabilitado' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
