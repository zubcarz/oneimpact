import { fireEvent, render, screen } from '@testing-library/react-native';
import { PLANS } from '@oneimpact/shared';
import { PlanSelector } from '@/components/ui/PlanSelector';
import { formatMonthlyPrice, subscriptionScreen } from '@/data/subscription';

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { Check: () => <View testID="icon-check" /> };
});

jest.mock('expo-haptics', () => ({
  // Devuelve una promesa como la API real: el componente encadena `.catch`.
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('PlanSelector', () => {
  it('renders the 3 plans from @oneimpact/shared', () => {
    render(<PlanSelector value="estandar" billing="monthly" onChange={jest.fn()} />);

    for (const plan of PLANS) {
      expect(screen.getByText(plan.name)).toBeTruthy();
    }
  });

  it('shows $5/$10/$15 with billing="monthly", read from PLANS', () => {
    render(<PlanSelector value="estandar" billing="monthly" onChange={jest.fn()} />);

    expect(screen.getByText('$5')).toBeTruthy();
    expect(screen.getByText('$10')).toBeTruthy();
    expect(screen.getByText('$15')).toBeTruthy();

    for (const plan of PLANS) {
      expect(screen.getByText(formatMonthlyPrice(plan, 'monthly'))).toBeTruthy();
    }
  });

  it('shows $4/$8/$12 and the "facturado anualmente" note with billing="annual"', () => {
    render(<PlanSelector value="estandar" billing="annual" onChange={jest.fn()} />);

    expect(screen.getByText('$4')).toBeTruthy();
    expect(screen.getByText('$8')).toBeTruthy();
    expect(screen.getByText('$12')).toBeTruthy();

    for (const plan of PLANS) {
      expect(screen.getByText(formatMonthlyPrice(plan, 'annual'))).toBeTruthy();
    }

    expect(screen.getAllByText(subscriptionScreen.billing.annualNote).length).toBeGreaterThan(0);
  });

  it('does not show the "facturado anualmente" note with billing="monthly"', () => {
    render(<PlanSelector value="estandar" billing="monthly" onChange={jest.fn()} />);

    expect(screen.queryByText(subscriptionScreen.billing.annualNote)).toBeNull();
  });

  it('calls onChange("premium") when "Premium" is pressed', () => {
    const onChange = jest.fn();
    render(<PlanSelector value="estandar" billing="monthly" onChange={onChange} />);

    fireEvent.press(screen.getByRole('button', { name: 'Premium' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('premium');
  });

  it('exposes accessibilityState.selected on the selected plan only', () => {
    render(<PlanSelector value="premium" billing="monthly" onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Premium' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Básico' }).props.accessibilityState.selected).toBe(
      false,
    );
    expect(screen.getByRole('button', { name: 'Estándar' }).props.accessibilityState.selected).toBe(
      false,
    );
  });
});
