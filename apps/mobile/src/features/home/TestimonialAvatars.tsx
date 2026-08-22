import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { overlay } from '@/theme/overlays';
import type { HomeTestimonial } from '@/data/home';

export interface TestimonialAvatarsProps {
  items: HomeTestimonial[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const AVATAR_SIZE = 56;

/** Selector de avatares de "Voces del cambio" (`componentes.md` #AvatarSelector). */
export function TestimonialAvatars({ items, activeIndex, onSelect }: TestimonialAvatarsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 20,
        paddingHorizontal: 16,
      }}
    >
      {items.map((item, index) => {
        const selected = index === activeIndex;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected }}
            onPress={() => onSelect(index)}
            className="items-center"
            style={{ width: 96 }}
          >
            <View
              className={
                selected ? 'rounded-full bg-highlight p-[3px]' : 'rounded-full p-[3px] opacity-70'
              }
              style={
                selected
                  ? {
                      shadowColor: overlay.highlightRing,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 1,
                      shadowRadius: 6,
                      elevation: 4,
                    }
                  : undefined
              }
            >
              <Image
                source={item.image}
                contentFit="cover"
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                }}
                className="rounded-full border border-white/60"
              />
            </View>
            <Text className="mt-2 text-[11px] font-semibold text-gray-900" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-[11px] italic text-gray-500" numberOfLines={1}>
              {item.role}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
