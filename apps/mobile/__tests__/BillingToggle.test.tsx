import { fireEvent, render, screen } from '@testing-library/react-native';
import { BillingToggle } from '@/components/ui/BillingToggle';
import { subscriptionScreen } from '@/data/subscription';

jest.mock('expo-haptics', () => ({
  // Devuelve una promesa como la API real: el componente encadena `.catch`.
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('BillingToggle', () => {
  const { monthly, annual } = subscriptionScreen.billing;

  it('renders the "Mensual" and "Anual" labels', () => {
    render(<BillingToggle value="monthly" onChange={jest.fn()} />);

    expect(screen.getByText(monthly)).toBeTruthy();
    expect(screen.getByText(annual)).toBeTruthy();
  });

  it('calls onChange("annual") once when "Anual" is pressed', () => {
    const onChange = jest.fn();
    render(<BillingToggle value="monthly" onChange={onChange} />);

    fireEvent.press(screen.getByRole('button', { name: annual }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('annual');
  });

  it('exposes accessibilityState.selected on the active option only, for either value', () => {
    const { rerender } = render(<BillingToggle value="monthly" onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: monthly }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: annual }).props.accessibilityState.selected).toBe(
      false,
    );

    rerender(<BillingToggle value="annual" onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: monthly }).props.accessibilityState.selected).toBe(
      false,
    );
    expect(screen.getByRole('button', { name: annual }).props.accessibilityState.selected).toBe(
      true,
    );
  });
});
