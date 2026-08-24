import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';

export interface WelcomeCheckProps {
  testID?: string;
}

/**
 * Check grande animado de Bienvenida (`pantallas-nuevas.md:36`, "check grande
 * animado (Reanimated spring)"). El estilo animado va en un `View` normal
 * envuelto por el `Animated.View` -- NativeWind no aplica `className` sobre
 * componentes de Reanimated, mismo patron que `CardPreview.tsx` y
 * `FullScreenMenu.tsx`. Corre una sola vez al montar: no hay dependencias que
 * lo repitan.
 */
export function WelcomeCheck({ testID }: WelcomeCheckProps) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 120 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle} testID={testID}>
      <View className="h-32 w-32 items-center justify-center rounded-full bg-white">
        <Check size={64} color={colors.darkGreen} strokeWidth={3} />
      </View>
    </Animated.View>
  );
}
