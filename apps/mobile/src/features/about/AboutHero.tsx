import { Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/layout';
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
}

/**
 * Hero de "Quienes somos": `stats-bg.jpg` a sangre con veil `forest/80`
 * (`pantallas-nuevas.md:18`), mismo molde que `ZoneDetailHero`/`ProjectDetailHero`
 * (imagen absoluta + `LinearGradient`), pero el overlay es un color plano, no un
 * degrade de dos tonos: se repite `overlay.forest80` en ambos stops para
 * mantener el patron de gradiente del resto de heros con un resultado solido.
 */
export function AboutHero({ onMenuPress }: AboutHeroProps) {
  const { height } = useWindowDimensions();

  return (
    <View style={{ height: height * HERO_HEIGHT_RATIO }}>
      <Image
        source={require('@/assets/images/stats-bg.jpg')}
        contentFit="cover"
        style={ABSOLUTE_FILL}
      />
      <LinearGradient colors={[overlay.forest80, overlay.forest80]} style={ABSOLUTE_FILL} />

      <Header logo="white" onMenuPress={onMenuPress} />

      <View className="absolute inset-0 justify-end px-5 pb-10">
        <Text className="text-4xl font-black leading-tight text-white">{aboutHero.title}</Text>
      </View>
    </View>
  );
}
