import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { RegisterForm } from '@/features/auth/RegisterForm';

const mockSignUp = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('@/auth', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

// `RegisterForm` imports `Button`/`Input` from the `@/components/ui` barrel
// (the codebase's convention, `apps/mobile/src/features/**`), which eagerly
// evaluates every sibling export -- including `Chip.tsx` (lucide's ESM
// build, not transformed under jest-expo, same failure as
// `FullScreenMenu.test.tsx`). No icon renders in this test, so it is stubbed
// out the same way that test does. Reanimated (pulled in via `CardPreview.tsx`
// in the same barrel) no longer needs a per-test mock: `jest.setup.js`
// installs a global one.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    ArrowRight: () => <View testID="icon-arrow-right" />,
    ChevronLeft: () => <View testID="icon-chevron-left" />,
    Check: () => <View testID="icon-check" />,
  };
});

const LOGIN_HREF = '/(auth)/login';

function fillValidForm() {
  fireEvent.changeText(screen.getByLabelText('Nombre'), 'Ana Reciente');
  fireEvent.changeText(screen.getByLabelText('Email'), 'ana@oneimpact.org');
  fireEvent.changeText(screen.getByLabelText('Contraseña'), 'User123!');
}

const submitButton = () => screen.getByRole('button', { name: 'Continuar al pago' });

describe('RegisterForm', () => {
  beforeEach(() => {
    mockSignUp.mockReset();
    mockRouterPush.mockClear();
  });

  it('blocks the submit and shows the schema copy for an invalid email', async () => {
    render(<RegisterForm onSuccess={jest.fn()} loginHref={LOGIN_HREF} />);

    fireEvent.changeText(screen.getByLabelText('Nombre'), 'Ana Reciente');
    fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'User123!');
    fireEvent.press(submitButton());

    expect(await screen.findByText('Email inválido')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('blocks the submit and shows the schema copy for a password shorter than 8 characters', async () => {
    render(<RegisterForm onSuccess={jest.fn()} loginHref={LOGIN_HREF} />);

    fireEvent.changeText(screen.getByLabelText('Nombre'), 'Ana Reciente');
    fireEvent.changeText(screen.getByLabelText('Email'), 'ana@oneimpact.org');
    fireEvent.changeText(screen.getByLabelText('Contraseña'), 'short1');
    fireEvent.press(submitButton());

    expect(await screen.findByText('Mínimo 8 caracteres')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp exactly once with only { name, email, password } on a valid submit', async () => {
    mockSignUp.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    render(<RegisterForm onSuccess={onSuccess} loginHref={LOGIN_HREF} />);

    fillValidForm();
    fireEvent.press(submitButton());

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));

    const payload = mockSignUp.mock.calls[0][0] as Record<string, unknown>;
    // Claves exactas, no `toMatchObject`, que dejaria pasar un campo de mas.
    expect(Object.keys(payload).sort()).toEqual(['email', 'name', 'password']);
    expect(payload).toEqual({
      name: 'Ana Reciente',
      email: 'ana@oneimpact.org',
      password: 'User123!',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
