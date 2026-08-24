import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { cx } from './cx';

export interface FollowButtonProps {
  following: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const LABEL_FOLLOWING = 'Siguiendo';
const LABEL_NOT_FOLLOWING = 'Seguir este proyecto';

/**
 * CTA pildora del detalle de proyecto
 * (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`, seccion "Detalle de
 * proyecto"). Puramente presentacional: no llama hooks de red ni conoce la
 * mutacion de follow, ese estado y la llamada viven en la ruta
 * (`app/projects/[id].tsx`).
 *
 * No compone `Button` (`src/components/ui/Button.tsx`): esa variante no tiene
 * un estado "seleccionado" con borde blanco ni el icono `Check`, y agregarlo
 * ahi complicaria las otras variantes (`accent`/`white`/`dark`/`ink`) que no
 * lo necesitan.
 */
export function FollowButton({ following, onPress, disabled = false }: FollowButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => undefined);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={following ? LABEL_FOLLOWING : LABEL_NOT_FOLLOWING}
      accessibilityState={{ selected: following, disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : handlePress}
      className={cx(
        'min-h-[44px] flex-row items-center justify-center gap-2 rounded-full px-7 py-3.5 active:opacity-90',
        following ? 'border border-gray-900 bg-white' : 'bg-accent',
        disabled && 'opacity-50',
      )}
    >
      {following ? <Check size={16} color={colors.gray900} strokeWidth={2} /> : null}
      <Text className="text-sm font-bold text-gray-900">
        {following ? LABEL_FOLLOWING : LABEL_NOT_FOLLOWING}
      </Text>
    </Pressable>
  );
}
