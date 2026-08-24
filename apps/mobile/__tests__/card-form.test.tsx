import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { simulatedCardSchema } from '@oneimpact/shared';
import { CardForm, type CardFormProps } from '@/features/auth/CardForm';

const mockMutate = jest.fn();

jest.mock('@/api/hooks', () => ({
  useCreateSubscription: () => ({ mutate: mockMutate, isPending: false }),
}));

// `CardForm` imports `Button`/`CardPreview`/`Input` from the `@/components/ui`
// barrel (the codebase's convention), which eagerly evaluates every sibling
// export -- including `Chip.tsx` (lucide's ESM build, not transformed under
// jest-expo), same failure worked around in `register-form.test.tsx`. No icon
// renders in this test, so it is stubbed out the same way that test does.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ArrowRight: () => <View testID="icon-arrow-right" />,
    ChevronLeft: () => <View testID="icon-chevron-left" />,
    Check: () => <View testID="icon-check" />,
  };
});

const VALID_PAN = '4242 4242 4242 4242';
// Same Luhn-valid prefix with the last digit flipped so it fails the checksum.
const INVALID_PAN = '4242 4242 4242 4241';
/**
 * The first 15 digits of `VALID_PAN`. It is Luhn-VALID -- `isValidLuhn` checks
 * the check digit, not the length -- which is exactly why the CTA used to let
 * it through and the payment would have been recorded with `last4: "2424"`.
 */
const INCOMPLETE_PAN = '4242 4242 4242 424';

function renderCardForm(overrides: Partial<CardFormProps> = {}) {
  return render(
    <CardForm
      planId="estandar"
      billing="monthly"
      priceLabel="$10"
      onSuccess={jest.fn()}
      onSessionExpired={jest.fn()}
      {...overrides}
    />,
  );
}

function fillForm(pan: string, expiry = '1229') {
  fireEvent.changeText(screen.getByLabelText('Numero de tarjeta'), pan);
  fireEvent.changeText(screen.getByLabelText('Titular'), 'Ana Reciente');
  fireEvent.changeText(screen.getByLabelText('Vencimiento (MM/AA)'), expiry);
  fireEvent.changeText(screen.getByLabelText('CVC'), '123');
}

const submitButton = () => screen.getByRole('button', { name: /Confirmar/ });

describe('CardForm', () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it('blocks the submit and never calls the mutator when the PAN fails Luhn', async () => {
    renderCardForm();

    fillForm(INVALID_PAN);
    fireEvent.press(submitButton());

    expect(await screen.findByText('Número de tarjeta inválido')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('blocks a Luhn-valid but incomplete PAN, which would be recorded with the wrong last4', async () => {
    renderCardForm();

    fillForm(INCOMPLETE_PAN);
    fireEvent.press(submitButton());

    expect(await screen.findByText('El número debe tener 16 dígitos')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('blocks an expiry year below the schema bound instead of letting the API answer 400', async () => {
    renderCardForm();

    // "12/01" -> 2001, under `simulatedCardSchema`'s `expYear >= 2024`. Sending
    // it makes the zod pipe answer 400, and a 400 carries no domain `code`, so
    // the screen could only show a generic error for what is really one bad
    // field.
    fillForm(VALID_PAN, '1201');
    fireEvent.press(submitButton());

    expect(await screen.findByText('Vencimiento inválido')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('still sends an expiry that is past but within the schema bound, so the simulator can decline it', async () => {
    renderCardForm();

    // "01/25" is expired, but it is a VALID payload: the simulator is meant to
    // answer 402 CARD_EXPIRED for it. Blocking it here would delete one of the
    // two decline cases the demo exists to show.
    fillForm(VALID_PAN, '0125');
    fireEvent.press(submitButton());

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    const payload = mockMutate.mock.calls[0][0] as { card: { expYear: number } };
    expect(payload.card.expYear).toBe(2025);
  });

  it('sends a payload whose card object has exactly {brand,last4,holder,expMonth,expYear} -- never number, pan or cvc', async () => {
    renderCardForm();

    fillForm(VALID_PAN);
    fireEvent.press(submitButton());

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    const payload = mockMutate.mock.calls[0][0] as {
      planId: unknown;
      billing: unknown;
      card: Record<string, unknown>;
    };

    // Claves exactas, no `toMatchObject`: eso dejaria pasar un campo de mas,
    // que es justo el mecanismo por el que se filtraria el PAN.
    expect(Object.keys(payload).sort()).toEqual(['billing', 'card', 'planId']);
    expect(Object.keys(payload.card).sort()).toEqual([
      'brand',
      'expMonth',
      'expYear',
      'holder',
      'last4',
    ]);
  });

  it('validates the sent card payload against the same .strict() schema the server runs', async () => {
    renderCardForm();

    fillForm(VALID_PAN);
    fireEvent.press(submitButton());

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));

    const payload = mockMutate.mock.calls[0][0] as { card: unknown };

    expect(simulatedCardSchema.safeParse(payload.card).success).toBe(true);
  });
});
