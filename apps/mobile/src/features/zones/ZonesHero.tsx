import { Text, View } from 'react-native';
import { TopoLines } from '@/components/icons/TopoLines';
import { zonesScreen } from '@/data/zones';

/** Seccion 1 de Zonas: hero de texto sobre crema con lineas topograficas (`pantallas/zonas.md` #1). */
export function ZonesHero() {
  return (
    <View className="overflow-hidden bg-cream px-5 pb-14 pt-24">
      <TopoLines />
      <Text className="mb-4 text-4xl font-bold leading-tight text-gray-900">
        {zonesScreen.heroTitle}
      </Text>
      <Text className="max-w-lg text-base leading-relaxed text-gray-600">
        {zonesScreen.heroSubtitle}
      </Text>
    </View>
  );
}
