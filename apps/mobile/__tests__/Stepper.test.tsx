import { render, screen } from '@testing-library/react-native';
import { Stepper } from '@/components/ui/Stepper';

describe('Stepper', () => {
  it('marks step 1 as the active header and leaves step 2 unmarked', () => {
    render(<Stepper current={1} />);

    const activeHeader = screen.getByRole('header');
    expect(activeHeader.props.children).toBe('1 Cuenta');
    expect(screen.getAllByRole('header')).toHaveLength(1);
    expect(screen.getByText('2 Pago').props.accessibilityRole).toBeUndefined();
  });

  it('marks step 2 as the active header and leaves step 1 unmarked', () => {
    render(<Stepper current={2} />);

    const activeHeader = screen.getByRole('header');
    expect(activeHeader.props.children).toBe('2 Pago');
    expect(screen.getAllByRole('header')).toHaveLength(1);
    expect(screen.getByText('1 Cuenta').props.accessibilityRole).toBeUndefined();
  });
});
