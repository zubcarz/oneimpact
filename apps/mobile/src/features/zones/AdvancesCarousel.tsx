import { useCallback, useState } from 'react';
import { FlatList, View, type ViewToken } from 'react-native';
import { AdvanceCard, Dots, SectionHeader } from '@/components/ui';
import { zonesScreen, type AdvanceView } from '@/data/zones';

const CARD_WIDTH = 220;
const CARD_GAP = 16;
/** Identidad estable a nivel de modulo: FlatList exige que no cambie entre renders. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export interface AdvancesCarouselProps {
  advances: AdvanceView[];
}

/**
 * Seccion 3 de Zonas: carrusel "Avances desde el territorio" (`pantallas/zonas.md` #3).
 * Presentacional: recibe `advances` por props (derivadas de `useProjects()`).
 */
export function AdvancesCarousel({ advances }: AdvancesCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number') {
        setActiveIndex(first.index);
      }
    },
    [],
  );

  return (
    <View className="bg-forest py-14">
      <View className="px-5">
        <SectionHeader
          tone="dark"
          weight="bold"
          titleClassName="text-3xl"
          title={zonesScreen.advancesTitle}
          subtitle={zonesScreen.advancesSubtitle}
        />
      </View>
      <FlatList
        horizontal
        data={advances}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, gap: CARD_GAP }}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        renderItem={({ item }: { item: AdvanceView }) => (
          <AdvanceCard title={item.title} body={item.body} image={item.image} year={item.year} />
        )}
      />
      <Dots count={advances.length} activeIndex={activeIndex} className="mt-6" />
    </View>
  );
}
