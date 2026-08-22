import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { cx } from './cx';

export type ChipVariant = 'home' | 'zones';

export interface ChipProps {
  /** Copia visible, en espanol. Por defecto "Ver mas". */
  label?: string;
  onPress?: (event: GestureResponderEvent) => void;
  /** `zones` usa `font-semibold gap-2` en vez de `font-bold gap-1`. */
  variant?: ChipVariant;
  className?: string;
  testID?: string;
}

/** Chip "Ver mas" del sistema de diseno (`componentes.md`). */
export function Chip({
  label = 'Ver mas',
  onPress,
  variant = 'home',
  className,
  testID,
}: ChipProps) {
  const containerClasses = cx(
    'flex-row items-center bg-accent px-4 py-2 rounded-full',
    variant === 'zones' ? 'gap-2' : 'gap-1',
    className,
  );
  const textClasses = cx(
    'text-gray-900 text-sm',
    variant === 'zones' ? 'font-semibold' : 'font-bold',
  );

  const content = (
    <>
      <Text className={textClasses}>{label}</Text>
      <ArrowRight size={16} color={colors.gray900} />
    </>
  );

  if (!onPress) {
    return (
      <View className={containerClasses} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      className={cx(containerClasses, 'active:opacity-90')}
    >
      {content}
    </Pressable>
  );
}
