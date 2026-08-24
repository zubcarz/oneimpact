import { Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';

export type BackButtonTone = 'glass' | 'solid';

export interface BackButtonProps {
  onPress: () => void;
  /**
   * `glass` para flotar sobre una foto oscura (`bg-white/20` + blur +
   * `border-white/50`, la superficie glass de `60-design-system.md`); `solid`
   * para el fondo crema de las pantallas de formulario.
   */
  tone?: BackButtonTone;
  /** Copia visible al lector de pantalla, en espanol. */
  accessibilityLabel?: string;
  testID?: string;
}

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/**
 * Boton de volver de toda la app.
 *
 * Existia tres veces copiado -- `ZoneDetailHero`, `ProjectDetailHero` y
 * `AuthScreenHeader` -- y no existia en las pantallas a las que solo se llega
 * por el menu full-screen (`/about`), donde el usuario quedaba sin salida
 * visible. Al unificarlo, "volver" se ve y se toca igual en todas partes: 44pt
 * de area tactil, pildora, chevron de 22 con stroke 2.
 */
export function BackButton({
  onPress,
  tone = 'glass',
  accessibilityLabel = 'Volver',
  testID,
}: BackButtonProps) {
  const isGlass = tone === 'glass';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      className={`h-11 w-11 items-center justify-center overflow-hidden rounded-full active:opacity-80 ${
        isGlass ? 'border border-white/50 bg-white/20' : 'border border-black/5 bg-white'
      }`}
    >
      {isGlass ? (
        <BlurView intensity={30} tint="light" style={ABSOLUTE_FILL} pointerEvents="none" />
      ) : null}
      {/*
        El chevron va en un contenedor con z-index propio: `BlurView` es
        absoluto y, sin esto, pinta por encima del icono en web -- el boton se
        veia como un circulo glass vacio.
      */}
      <View className="z-10">
        <ChevronLeft size={22} color={isGlass ? colors.white : colors.gray900} />
      </View>
    </Pressable>
  );
}
