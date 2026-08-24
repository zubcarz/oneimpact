import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ApiError } from '@oneimpact/api-client';
import { Screen } from '@/components/layout';
import { Button } from '@/components/ui';
import {
  ZoneAdvances,
  ZoneDetailHero,
  ZoneEmptyAdvances,
  ZonesError,
  ZonesSkeleton,
} from '@/features/zones';
import { toAdvanceView, zoneDetail, assetForKey, type AdvanceView } from '@/data/zones';
import { useZone } from '@/api/hooks';

/**
 * Detalle de zona `/zone/[slug]` (pantalla que la web no tiene, 403; disenada
 * dentro del sistema segun `pantallas/zonas.md`, seccion "Detalle de zona").
 */
export default function ZoneDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: zone, isPending, isError, error, refetch } = useZone(slug);

  const handleBack = () => router.back();
  const handleCta = () => router.push(zoneDetail.ctaHref as Href);

  // The 404 the server raises for an unknown slug (`ZONE_NOT_FOUND`,
  // `apps/api/src/modules/catalog/application/catalog.service.ts`), not "not
  // in the local array" -- this is the source of truth now.
  const notFound = isError && error instanceof ApiError && error.status === 404;

  const heroImage = zone ? assetForKey(zone.imageKey) : undefined;

  const zoneAdvances = useMemo<AdvanceView[]>(
    () =>
      (zone?.projects ?? [])
        .map(toAdvanceView)
        .filter((advance): advance is AdvanceView => Boolean(advance)),
    [zone],
  );

  if (notFound) {
    return (
      <Screen statusBar="dark" bg="bg-cream" scroll={false}>
        <View className="flex-1 items-center justify-center gap-6 px-5">
          <Text className="text-3xl font-bold text-gray-900">{zoneDetail.notFoundTitle}</Text>
          <Button variant="dark" label={zoneDetail.back} onPress={handleBack} />
        </View>
      </Screen>
    );
  }

  if (isPending) {
    return (
      <Screen statusBar="dark" bg="bg-cream" scroll={false}>
        <ZonesSkeleton />
      </Screen>
    );
  }

  // Also covers the defensive "no crash" case (D3): a zone whose `imageKey`
  // has no mapped local asset. Never happens with today's seed, but
  // `assetForKey` is non-throwing on purpose for this remote path.
  if (isError || !zone || heroImage === undefined) {
    return (
      <Screen statusBar="dark" bg="bg-cream" scroll={false}>
        <ZonesError onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen statusBar="light" bg="bg-cream">
      <ZoneDetailHero name={zone.name} image={heroImage} onBack={handleBack} />

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
