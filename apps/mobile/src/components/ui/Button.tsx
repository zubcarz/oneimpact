import { Pressable, Text, type GestureResponderEvent } from 'react-native';
import { cx } from './cx';

export type ButtonVariant = 'accent' | 'white' | 'dark' | 'ink';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  /** Copia visible del boton, en espanol. */
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  /** `lg` es para CTAs grandes: `py-4 text-base font-semibold`. */
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
  testID?: string;
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { container: string; textColor: string; fontWeight: string }
> = {
  accent: { container: 'bg-accent px-7', textColor: 'text-gray-900', fontWeight: 'font-bold' },
  white: { container: 'bg-white px-7', textColor: 'text-gray-900', fontWeight: 'font-bold' },
  dark: { container: 'bg-gray-900 px-6', textColor: 'text-white', fontWeight: 'font-semibold' },
  ink: {
    container: 'bg-ink px-7 border border-white/20',
    textColor: 'text-white',
    fontWeight: 'font-bold',
  },
};

/**
 * Boton pildora del sistema de diseno (`02-Analisis-Visual/componentes.md`).
 * Variantes de color por `variant`; `size="lg"` es el modificador para CTAs
 * grandes (`py-4 text-base font-semibold`) independiente de la variante.
 */
export function Button({
  label,
  onPress,
  variant = 'accent',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { container, textColor, fontWeight } = VARIANT_STYLES[variant];
  const paddingY = size === 'lg' ? 'py-4' : variant === 'dark' ? 'py-3.5' : 'py-3';
  const textSize = size === 'lg' ? 'text-base' : 'text-sm';
  const resolvedFontWeight = size === 'lg' ? 'font-semibold' : fontWeight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      testID={testID}
      className={cx(
        'min-h-[44px] items-center justify-center rounded-full active:opacity-90',
        container,
        paddingY,
        fullWidth && 'w-full',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Text className={cx(textSize, resolvedFontWeight, textColor)}>{label}</Text>
    </Pressable>
  );
}
