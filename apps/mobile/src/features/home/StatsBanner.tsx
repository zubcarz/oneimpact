import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Button } from '@/components/ui';
import { stats, statsBackground } from '@/data/home';

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Duracion total del contador animado (ms), spec `pantallas/inicio.md` #6. */
const COUNT_DURATION_MS = 1200;
const COUNT_STEPS = 30;
const COUNT_STEP_MS = COUNT_DURATION_MS / COUNT_STEPS;

/** Formatea el valor intermedio del contador igual que `stats.display` ("35K"). */
function formatCount(value: number): string {
  return `${Math.round(value / 1000)}K`;
}

/** Seccion 6 de Inicio: banner de stats con contador animado (`pantallas/inicio.md` #6). */
export function StatsBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const progress = Math.min(step / COUNT_STEPS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.round(stats.value * eased));
      if (step >= COUNT_STEPS) {
        clearInterval(interval);
      }
    }, COUNT_STEP_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <View className="overflow-hidden">
      <Image source={statsBackground} contentFit="cover" style={ABSOLUTE_FILL} />
      <View className="absolute inset-0 bg-forest/80" />
      <View className="items-center px-4 py-24">
        <Text className="mb-1 text-lg text-white/80">{stats.lead}</Text>
        <Text
          testID="stats-counter"
          accessibilityLabel={stats.display}
          className="mb-1 text-7xl font-black leading-none text-accent"
        >
          {formatCount(count)}
        </Text>
        <Text className="mb-10 text-xl font-medium text-white">{stats.caption}</Text>
        <Button
          label={stats.cta}
          variant="accent"
          className="px-8"
          onPress={() => router.push(stats.ctaHref as Href)}
        />
      </View>
    </View>
  );
}
