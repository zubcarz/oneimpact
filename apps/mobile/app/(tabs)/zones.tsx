import { useMemo, useState } from 'react';
import { Header, FullScreenMenu, Screen } from '@/components/layout';
import {
  AdvancesCarousel,
  ZonesError,
  ZonesHero,
  ZonesList,
  ZonesSkeleton,
} from '@/features/zones';
import { useProjects, useZones } from '@/api/hooks';
import { toAdvanceView, toZoneView, type AdvanceView, type ZoneView } from '@/data/zones';

export default function ZonesScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const zonesQuery = useZones();
  const projectsQuery = useProjects();

  const isLoading = zonesQuery.isPending || projectsQuery.isPending;
  const isError = zonesQuery.isError || projectsQuery.isError;

  // `toZoneView`/`toAdvanceView` never reorder -- the visual order (1..5) is
  // whatever `useZones()`/`useProjects()` return, which the API/MSW already
  // sort (`orderBy: { order: 'asc' }`, `SEED_ZONES` declaration order).
  const zones = useMemo<ZoneView[]>(
    () =>
      (zonesQuery.data?.items ?? [])
        .map(toZoneView)
        .filter((zone): zone is ZoneView => Boolean(zone)),
    [zonesQuery.data],
  );
  const advances = useMemo<AdvanceView[]>(
    () =>
      (projectsQuery.data?.items ?? [])
        .map(toAdvanceView)
        .filter((advance): advance is AdvanceView => Boolean(advance)),
    [projectsQuery.data],
  );

  const handleRetry = () => {
    zonesQuery.refetch();
    projectsQuery.refetch();
  };

  return (
    <Screen statusBar="dark" bg="bg-cream">
      <Header logo="black" onMenuPress={() => setMenuOpen(true)} />
      <FullScreenMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <ZonesHero />
      {isLoading ? (
        <ZonesSkeleton />
      ) : isError ? (
        <ZonesError onRetry={handleRetry} />
      ) : (
        <>
          <ZonesList zones={zones} />
          <AdvancesCarousel advances={advances} />
        </>
      )}
    </Screen>
  );
}
