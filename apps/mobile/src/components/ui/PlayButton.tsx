import { Pressable, View, type GestureResponderEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { Play } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { cx } from './cx';

export interface PlayButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  className?: string;
  testID?: string;
}

const CIRCLE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/**
 * Boton circular de reproduccion sobre miniaturas de video (`componentes.md`).
 * `BlurView` provee el efecto glass; el circulo recorta con `overflow-hidden`.
 */
export function PlayButton({
  onPress,
  accessibilityLabel = 'Reproducir video',
  className,
  testID,
}: PlayButtonProps) {
  const circle = (
    <View
      className={cx(
        'h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/20',
        className,
      )}
    >
      <BlurView intensity={20} tint="light" style={CIRCLE_FILL} />
      <Play size={28} color={colors.white} fill={colors.white} />
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessibilityLabel={accessibilityLabel}>
        {circle}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
    >
      {circle}
    </Pressable>
  );
}
