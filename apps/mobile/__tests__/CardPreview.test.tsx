import { render, screen } from '@testing-library/react-native';
import { CardPreview } from '@/components/ui/CardPreview';

describe('CardPreview', () => {
  const baseProps = {
    pan: '4242424242424242',
    holder: 'Ana Torres',
    expMonth: '08',
    expYear: '2030',
  };

  it('shows the detected brand as text for a Visa PAN', () => {
    render(<CardPreview {...baseProps} />);

    expect(screen.getByText('VISA')).toBeTruthy();
  });

  it('never renders the full PAN or its first 12 digits, only the masked last 4', () => {
    render(<CardPreview {...baseProps} />);

    // Primera linea de defensa del invariante del PAN en la UI: si este assert
    // negativo falla, el numero completo se esta filtrando a la pantalla.
    expect(screen.queryByText(baseProps.pan)).toBeNull();
    expect(screen.queryByText(/424242424242/)).toBeNull();
    expect(screen.getByText(/4242$/)).toBeTruthy();
  });
});
