import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ZoneRow } from '@/components/ui';
import { zones, zonesScreen } from '@/data/zones';

/** Seccion 2 de Zonas: columna con las 5 zonas (`pantallas/zonas.md` #2). */
export function ZonesList() {
  const handlePress = (slug: string) => {
    router.push(`/zone/${slug}` as Href);
  };

  return (
    <View className="gap-4 bg-cream px-5 pb-14">
      {zones.map((zone) => (
        <ZoneRow
          key={zone.slug}
          slug={zone.slug}
          name={zone.name}
          description={zone.description}
          image={zone.image}
          chipLabel={zonesScreen.chipLabel}
          onPress={handlePress}
        />
      ))}
    </View>
  );
}
