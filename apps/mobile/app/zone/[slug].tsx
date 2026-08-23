import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Screen } from '@/components/layout';
import { Button } from '@/components/ui';
import { ZoneAdvances, ZoneDetailHero, ZoneEmptyAdvances } from '@/features/zones';
import { advancesByZone, getZone, zoneDetail } from '@/data/zones';

/**
 * Detalle de zona `/zone/[slug]` (pantalla que la web no tiene, 403; disenada
 * dentro del sistema segun `pantallas/zonas.md`, seccion "Detalle de zona").
 */
export default function ZoneDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const zone = getZone(slug);

  const handleBack = () => router.back();
  const handleCta = () => router.push(zoneDetail.ctaHref as Href);

  if (!zone) {
    return (
      <Screen statusBar="dark" bg="bg-cream" scroll={false}>
        <View className="flex-1 items-center justify-center gap-6 px-5">
          <Text className="text-3xl font-bold text-gray-900">{zoneDetail.notFoundTitle}</Text>
          <Button variant="dark" label={zoneDetail.back} onPress={handleBack} />
        </View>
      </Screen>
    );
  }

  const zoneAdvances = advancesByZone(slug);

  return (
    <Screen statusBar="light" bg="bg-cream">
      <ZoneDetailHero name={zone.name} image={zone.image} onBack={handleBack} />

      <View className="bg-cream px-5 py-14">
        <Text className="text-base leading-relaxed text-gray-700">{zone.description}</Text>
      </View>

      {zoneAdvances.length > 0 ? <ZoneAdvances advances={zoneAdvances} /> : <ZoneEmptyAdvances />}

      <View className="bg-cream px-5 py-14">
        <Button variant="accent" size="lg" fullWidth label={zoneDetail.cta} onPress={handleCta} />
      </View>

    </Screen>
  );
}
