import { fireEvent, render, screen } from '@testing-library/react-native';
import { BackButton } from '@/components/ui/BackButton';

// `lucide-react-native` se publica como ESM sin transformar, fuera del
// allowlist de `transformIgnorePatterns`: se sustituye por un stub, misma
// convencion que `__tests__/FullScreenMenu.test.tsx`.
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { ChevronLeft: () => <View testID="icon-chevron-left" /> };
});

/**
 * `BackButton` es el unico control de "volver" de la app desde que se unifico
 * (`src/components/ui/BackButton.tsx`): lo usan los dos heros de detalle, el
 * hero de "Quienes somos" y el header de las tres pantallas de auth. Lo que se
 * prueba aca es lo que un lector de pantalla y un dedo necesitan; el tono
 * (glass/solid) es presentacion y no se afirma.
 */
describe('BackButton', () => {
  it('llama a onPress al tocarlo', () => {
    const onPress = jest.fn();
    render(<BackButton onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('acepta una etiqueta accesible propia para no repetir "Volver" fuera de contexto', () => {
    render(<BackButton onPress={jest.fn()} accessibilityLabel="Volver a Zonas" tone="solid" />);

    expect(screen.getByRole('button', { name: 'Volver a Zonas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  });
});
