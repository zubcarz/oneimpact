import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Zone } from '@oneimpact/shared';
import { Screen } from '@/components/layout';
import { Button, JourneyLine, SubscriptionCard } from '@/components/ui';
import {
  DashboardHeader,
  FollowedProjects,
  LatestUpdateSection,
  NotificationsSection,
} from '@/features/dashboard';
import {
  useDashboard,
  useMarkNotificationRead,
  useNotifications,
  useProjects,
  useZones,
} from '@/api/hooks';
import { useAuth } from '@/auth';
import { toProjectCardView, type ProjectCardView } from '@/data/projects';

/**
 * Dashboard logueado (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`,
 * "Dashboard (`/(app)/dashboard`)"). Compone `SubscriptionCard`, `JourneyLine`
 * y las 4 secciones de `src/features/dashboard`, todas presentacionales: esta
 * pantalla es la unica que llama hooks de red (`useDashboard`, `useProjects`,
 * `useZones`, `useNotifications`) y resuelve `Project -> ProjectCardView`
 * igual que `app/(tabs)/projects.tsx`.
 */
export default function DashboardScreen() {
  const { user } = useAuth();
  const dashboardQuery = useDashboard();
  const notificationsQuery = useNotifications();
  const projectsQuery = useProjects();
  const zonesQuery = useZones();
  const markNotificationRead = useMarkNotificationRead();

  const isPending =
    dashboardQuery.isPending ||
    notificationsQuery.isPending ||
    projectsQuery.isPending ||
    zonesQuery.isPending;
  const isError =
    dashboardQuery.isError ||
    notificationsQuery.isError ||
    projectsQuery.isError ||
    zonesQuery.isError;

  // Mismo patron que `app/(tabs)/projects.tsx:38-42`: `GET /v1/projects`
  // devuelve `zoneId`, no el nombre de la zona.
  const zoneById = useMemo(() => {
    const map = new Map<string, Zone>();
    (zonesQuery.data?.items ?? []).forEach((zone) => map.set(zone.id, zone));
    return map;
  }, [zonesQuery.data]);

  const allProjects = useMemo<ProjectCardView[]>(
    () =>
      (projectsQuery.data?.items ?? []).map((project) =>
        toProjectCardView(project, zoneById.get(project.zoneId)),
      ),
    [projectsQuery.data, zoneById],
  );

  const followedProjects = useMemo(() => {
    const followedProjectIds = dashboardQuery.data?.followedProjectIds ?? [];
    return allProjects.filter((project) => followedProjectIds.includes(project.id));
  }, [allProjects, dashboardQuery.data]);

  const latestUpdate = dashboardQuery.data?.latestUpdate;
  const latestUpdateProjectTitle = useMemo(
    () => followedProjects.find((project) => project.id === latestUpdate?.projectId)?.title,
    [followedProjects, latestUpdate],
  );

  const handleRetry = () => {
    dashboardQuery.refetch();
    notificationsQuery.refetch();
    projectsQuery.refetch();
    zonesQuery.refetch();
  };

  const dashboard = dashboardQuery.data;

  if (isPending) {
    return (
      <Screen bg="bg-cream" scroll={false}>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-sm text-gray-500">Cargando tu dashboard...</Text>
        </View>
      </Screen>
    );
  }

  if (isError || !dashboard) {
    return (
      <Screen bg="bg-cream" scroll={false}>
        <View className="flex-1 items-center justify-center gap-4 px-5">
          <Text className="text-center text-xl font-bold text-gray-900">
            No pudimos cargar tu dashboard
          </Text>
          <Text className="text-center text-sm text-gray-600">
            Revisa tu conexión e intenta de nuevo.
          </Text>
          <Button label="Reintentar" variant="dark" onPress={handleRetry} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="bg-cream" scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dashboardQuery.isRefetching}
            onRefresh={() => dashboardQuery.refetch()}
          />
        }
      >
        <DashboardHeader
          userName={user?.name ?? ''}
          unreadNotifications={dashboard.unreadNotifications}
        />
        <View className="px-5 py-6">
          <SubscriptionCard
            plan={dashboard.plan}
            billing={dashboard.billing}
            status={dashboard.status}
            activeMonths={dashboard.activeMonths}
            startedAt={dashboard.startedAt}
            onManagePress={() => router.push('/(app)/profile')}
          />
          <JourneyLine
            activeMonths={dashboard.activeMonths}
            totalPoints={dashboard.journeyPoints}
            className="mt-6"
          />
        </View>
        <FollowedProjects
          projects={followedProjects}
          onPressProject={(id) => router.push(`/projects/${id}`)}
          onExplorePress={() => router.push('/(tabs)/projects')}
        />
        <LatestUpdateSection update={latestUpdate} projectTitle={latestUpdateProjectTitle} />
        <NotificationsSection
          notifications={notificationsQuery.data?.items ?? []}
          onPressNotification={(id) => markNotificationRead.mutate(id)}
        />
      </ScrollView>
    </Screen>
  );
}
