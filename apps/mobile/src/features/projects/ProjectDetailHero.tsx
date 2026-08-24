import { Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/ui';
import { overlay } from '@/theme/overlays';
import { projectDetail } from '@/data/projects';

export interface ProjectDetailHeroProps {
  /** Copia visible, en espanol. */
  title: string;
  image: number;
  /** Nombre de la zona a la que pertenece el proyecto; sin chip si no se pudo resolver. */
  zoneName: string | undefined;
  onBack: () => void;
}

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
/** 55% del alto de ventana (`pantallas-nuevas.md`, "Detalle de proyecto"). */
const HERO_HEIGHT_RATIO = 0.55;

/**
 * Hero del detalle de proyecto: mismo molde que `ZoneDetailHero`
 * (`src/features/zones/ZoneDetailHero.tsx`) -- imagen a sangre con
 * gradiente + `BackButton` glass -- mas un chip de zona `bg-accent` sobre el
 * titulo. A diferencia de Zonas, el titulo aca usa `font-black` (900), como
 * en Home (`pantallas-nuevas.md`, "Detalle de proyecto").
 */
export function ProjectDetailHero({ title, image, zoneName, onBack }: ProjectDetailHeroProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ height: height * HERO_HEIGHT_RATIO }}>
      <Image source={image} contentFit="cover" style={ABSOLUTE_FILL} />
      <LinearGradient colors={[overlay.black20, overlay.black80]} style={ABSOLUTE_FILL} />

      <View className="absolute inset-0 justify-end px-5 pb-8">
        {zoneName !== undefined ? (
          <View className="mb-3 self-start rounded-full bg-accent px-3 py-1">
            <Text className="text-xs font-bold text-gray-900">{zoneName}</Text>
          </View>
        ) : null}
        <Text className="text-3xl font-black text-white">{title}</Text>
      </View>

      <View className="absolute left-0 right-0 top-0 px-5 py-4" style={{ paddingTop: insets.top }}>
        <BackButton onPress={onBack} accessibilityLabel={projectDetail.back} />
      </View>
    </View>
  );
}
