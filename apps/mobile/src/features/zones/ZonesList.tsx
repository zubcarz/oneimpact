import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ZoneRow } from '@/components/ui';
import { zonesScreen, type ZoneView } from '@/data/zones';

export interface ZonesListProps {
  zones: ZoneView[];
}

/**
 * Seccion 2 de Zonas: columna con las zonas (`pantallas/zonas.md` #2).
 * Presentacional: recibe `zones` por props, no llama hooks de red -- el orden
 * de la lista es el que trae la respuesta (`useZones()`, ordenada por la API).
 */
export function ZonesList({ zones }: ZonesListProps) {
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
