import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button, ImageCard } from '@/components/ui';
import { homeZones, zonesSection, type HomeZone } from '@/data/home';

/** Seccion 3 de Inicio: carrusel de zonas (`pantallas/inicio.md` #3). */
export function ZonesCarousel() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * 0.75);

  const handlePress = (slug: string) => {
    router.push(`/zone/${slug}` as Href);
  };

  return (
    <View className="bg-accent-light py-16">
      <View className="px-4">
        <Text className="mb-3 text-3xl font-black leading-tight text-ink">
          {zonesSection.title}
        </Text>
        <Text className="mb-8 max-w-md text-base text-ink/60">{zonesSection.subtitle}</Text>
      </View>
      <FlatList
        horizontal
        data={homeZones}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
        snapToInterval={cardWidth + 16}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }: { item: HomeZone }) => (
          <ImageCard
            title={item.name}
            image={item.image}
            width={cardWidth}
            onPress={() => handlePress(item.slug)}
          />
        )}
      />
      <View className="mt-10 items-center px-4">
        <Button
          label={zonesSection.cta}
          variant="ink"
          onPress={() => router.push(zonesSection.ctaHref as Href)}
        />
      </View>
    </View>
  );
}
