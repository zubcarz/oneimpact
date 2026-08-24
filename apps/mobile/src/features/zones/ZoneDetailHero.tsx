import { Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/ui';
import { overlay } from '@/theme/overlays';
import { zoneDetail } from '@/data/zones';

export interface ZoneDetailHeroProps {
  /** Copia visible, en espanol. */
  name: string;
  image: number;
  onBack: () => void;
}

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
/** 55% del alto de ventana (`pantallas/zonas.md`, "Detalle de zona"). */
const HERO_HEIGHT_RATIO = 0.55;

/**
 * Hero del detalle de zona: imagen a sangre con gradiente + boton back glass
 * (`pantallas/zonas.md`, "Detalle de zona"). A diferencia del resto de Zonas,
 * el titulo aca usa `font-black` (900), como en Home.
 */
export function ZoneDetailHero({ name, image, onBack }: ZoneDetailHeroProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: height * HERO_HEIGHT_RATIO }}>
      <Image source={image} contentFit="cover" style={ABSOLUTE_FILL} />
      <LinearGradient colors={[overlay.black20, overlay.black80]} style={ABSOLUTE_FILL} />

      <View className="absolute inset-0 justify-end px-5 pb-8">
        <Text className="text-4xl font-black text-white">{name}</Text>
      </View>

      <View className="absolute left-0 right-0 top-0 px-5 py-4" style={{ paddingTop: insets.top }}>
        <BackButton onPress={onBack} accessibilityLabel={zoneDetail.back} />
      </View>
    </View>
  );
}
