import { useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { colors } from '@oneimpact/ui-tokens';
import { Button, GlassCard, PlayButton } from '@/components/ui';
import { overlay } from '@/theme/overlays';
import { testimonials, testimonialsSection } from '@/data/home';
import { TestimonialAvatars } from './TestimonialAvatars';

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const CARD_SHADOW = {
  shadowColor: colors.gray900,
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.16,
  shadowRadius: 40,
  elevation: 8,
} as const;

/** Seccion 4 de Inicio: "Voces del cambio" (`pantallas/inicio.md` #4). */
export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = testimonials[activeIndex];

  const handleSelect = (index: number) => {
    Haptics.selectionAsync().catch(() => undefined);
    setActiveIndex(index);
  };

  return (
    <View className="overflow-hidden bg-cream-warm px-4 py-16">
      <View
        pointerEvents="none"
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/10"
      />

      <View className="max-w-md">
        <Text className="mb-3 text-3xl font-black leading-tight text-gray-900">
          {testimonialsSection.title}
        </Text>
        <Text className="text-sm text-gray-600">{testimonialsSection.subtitle}</Text>
      </View>

      <View className="mt-8 max-w-md self-stretch">
        <View className="rounded-3xl bg-cream-card p-3" style={CARD_SHADOW}>
          <View className="overflow-hidden rounded-3xl" style={{ aspectRatio: 3 / 4 }}>
            <Animated.View key={active.id} entering={FadeIn.duration(300)} style={ABSOLUTE_FILL}>
              <Image source={active.image} contentFit="cover" style={ABSOLUTE_FILL} />
              <LinearGradient
                colors={[overlay.transparent, overlay.black45]}
                style={ABSOLUTE_FILL}
              />
            </Animated.View>
            <View className="absolute inset-0 items-center justify-center">
              <PlayButton accessibilityLabel="Testimonio en audio próximamente" />
            </View>
            <GlassCard
              title={active.name}
              subtitle={active.role}
              className="absolute bottom-4 left-4 right-4"
            />
          </View>
        </View>

        <Text
          testID="testimonial-quote"
          className="mt-5 px-1 text-sm leading-relaxed text-gray-700"
        >
          {active.quote}
        </Text>
      </View>

      <View className="mt-7">
        <TestimonialAvatars
          items={testimonials}
          activeIndex={activeIndex}
          onSelect={handleSelect}
        />
      </View>

      <Button
        label={testimonialsSection.cta}
        variant="dark"
        fullWidth
        className="mt-10"
        onPress={() => router.push(testimonialsSection.ctaHref as Href)}
      />
    </View>
  );
}
