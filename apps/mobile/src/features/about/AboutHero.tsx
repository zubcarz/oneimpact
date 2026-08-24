import { Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/layout';
import { BackButton } from '@/components/ui';
import { overlay } from '@/theme/overlays';
import { aboutHero } from '@/data/about';

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
/** 50% del alto de ventana (`pantallas-nuevas.md`, "Quienes somos"). */
const HERO_HEIGHT_RATIO = 0.5;

export interface AboutHeroProps {
  /**
   * `AboutHero` es la unica seccion de esta pantalla con fondo oscuro, asi que
   * aloja el `Header` (a diferencia de Zonas/Proyectos, donde vive suelto en
   * la ruta): esta prop deja que `app/about.tsx` abra el `FullScreenMenu`.
   */
  onMenuPress?: () => void;
  /**
   * "Quienes somos" vive fuera de `(tabs)`, asi que no tiene tab bar, y solo se
   * alcanza desde el menu full-screen: sin este boton el usuario se queda sin
   * salida visible y tiene que volver a abrir el menu para irse.
   */
  onBack?: () => void;
}

/**
 * Hero de "Quienes somos": `stats-bg.jpg` a sangre con veil `forest/80`
 * (`pantallas-nuevas.md:18`), mismo molde que `ZoneDetailHero`/`ProjectDetailHero`
 * (imagen absoluta + `LinearGradient`), pero el overlay es un color plano, no un
 * degrade de dos tonos: se repite `overlay.forest80` en ambos stops para
 * mantener el patron de gradiente del resto de heros con un resultado solido.
 */
export function AboutHero({ onMenuPress, onBack }: AboutHeroProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: height * HERO_HEIGHT_RATIO }}>
      <Image
        source={require('@/assets/images/stats-bg.jpg')}
        contentFit="cover"
        style={ABSOLUTE_FILL}
      />
      <LinearGradient colors={[overlay.forest80, overlay.forest80]} style={ABSOLUTE_FILL} />

      <Header logo="white" onMenuPress={onMenuPress} />

      {onBack !== undefined ? (
        // Debajo del `Header`, que ya ocupa la franja del logo y el menu.
        <View className="absolute left-5 z-10" style={{ top: insets.top + 64 }}>
          <BackButton onPress={onBack} accessibilityLabel={aboutHero.back} />
        </View>
      ) : null}

      <View className="absolute inset-0 justify-end px-5 pb-10">
        <Text className="text-4xl font-black leading-tight text-white">{aboutHero.title}</Text>
      </View>
    </View>
  );
}
