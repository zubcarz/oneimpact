import { fireEvent, render, screen } from '@testing-library/react-native';
import { ApiError } from '@oneimpact/api-client';
import { LoginForm } from '@/features/auth/LoginForm';

const mockSignIn = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('@/auth', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

// Same barrel-eagerly-evaluates-lucide problem worked around in
// `register-form.test.tsx` and `card-form.test.tsx`: `LoginForm` imports
// `Button`/`Input` from the `@/components/ui` barrel, which also re-exports
// `Chip.tsx` (lucide's ESM build, not transformed under jest-expo).
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ArrowRight: () => <View testID="icon-arrow-right" />,
    ChevronLeft: () => <View testID="icon-chevron-left" />,
    Check: () => <View testID="icon-check" />,
  };
});

const submitButton = () => screen.getByRole('button', { name: 'Iniciar sesión' });

function fillValidForm() {
  fireEvent.changeText(screen.getByLabelText('Email'), 'ana@oneimpact.org');
  fireEvent.changeText(screen.getByLabelText('Contraseña'), 'User123!');
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockRouterPush.mockClear();
  });

  it('blocks the submit for an invalid email and never calls signIn', async () => {
    render(<LoginForm onSuccess={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'User123!');
    fireEvent.press(submitButton());

    // The copy comes from `loginSchema` itself
    // (`packages/shared/src/schemas/auth.ts:12`), never from a second string
    // declared in this screen. Asserting the schema's exact message is what
    // keeps the two from drifting apart.
    expect(await screen.findByText('Email inválido')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows the generic message on a 401 and does not navigate', async () => {
    mockSignIn.mockRejectedValue(
      new ApiError(401, 'Email o contraseña incorrectos', { code: 'INVALID_CREDENTIALS' }),
    );
    const onSuccess = jest.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    fillValidForm();
    fireEvent.press(submitButton());

    expect(await screen.findByText('Email o contraseña incorrectos')).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
