import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import type { Zone } from '@oneimpact/shared';
import { Header, FullScreenMenu, Screen } from '@/components/layout';
import { FilterChips, type FilterChipItem } from '@/components/ui';
import { ProjectsError, ProjectsHero, ProjectsList, ProjectsSkeleton } from '@/features/projects';
import { useProjects, useZones } from '@/api/hooks';
import { projectsScreen, toProjectCardView, type ProjectCardView } from '@/data/projects';

/** Sentinel del chip "Todas": no es un `slug` real, mapea de vuelta a `null`. */
const ALL_ZONES_VALUE = 'all';

export default function ProjectsScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoneSlug, setZoneSlug] = useState<string | null>(null);

  const zonesQuery = useZones();
  const projectsQuery = useProjects(zoneSlug ? { zoneSlug } : undefined);

  const isLoading = zonesQuery.isPending || projectsQuery.isPending;
  const isError = zonesQuery.isError || projectsQuery.isError;

  // Same order as `useZones()` returns -- the API/MSW already sort by
  // `order` (`app/(tabs)/zones.tsx:21-23`), so this never reorders on its own.
  // Memoized so the two `useMemo` below keep a stable dependency.
  const zones = useMemo<Zone[]>(() => zonesQuery.data?.items ?? [], [zonesQuery.data]);

  const chipItems = useMemo<FilterChipItem[]>(
    () => [
      { value: ALL_ZONES_VALUE, label: projectsScreen.allZonesChipLabel },
      ...zones.map((zone) => ({ value: zone.slug, label: zone.name })),
    ],
    [zones],
  );

  // `GET /v1/projects` returns `zoneId`, not the zone name or slug (hallazgo 3
  // del plan) -- the card's zone chip needs this map to resolve it.
  const zoneById = useMemo(() => {
    const map = new Map<string, Zone>();
    zones.forEach((zone) => map.set(zone.id, zone));
    return map;
  }, [zones]);

  const projects = useMemo<ProjectCardView[]>(
    () =>
      (projectsQuery.data?.items ?? []).map((project) =>
        toProjectCardView(project, zoneById.get(project.zoneId)),
      ),
    [projectsQuery.data, zoneById],
  );

  const handleRetry = () => {
    zonesQuery.refetch();
    projectsQuery.refetch();
  };

  const handleChangeZone = (value: string) => {
    setZoneSlug(value === ALL_ZONES_VALUE ? null : value);
  };

  const handlePressProject = (id: string) => {
    router.push(`/projects/${id}`);
  };

  return (
    <Screen statusBar="dark" bg="bg-cream">
      <Header logo="black" onMenuPress={() => setMenuOpen(true)} />
      <FullScreenMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProjectsHero />
      <FilterChips
        items={chipItems}
        value={zoneSlug ?? ALL_ZONES_VALUE}
        onChange={handleChangeZone}
        className="bg-cream px-5 pb-6"
      />
      {isLoading ? (
        <ProjectsSkeleton />
      ) : isError ? (
        <ProjectsError onRetry={handleRetry} />
      ) : (
        <ProjectsList projects={projects} onPressProject={handlePressProject} />
      )}
    </Screen>
  );
}
