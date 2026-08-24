import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError } from '@oneimpact/api-client';
import { Screen } from '@/components/layout';
import { Button, FollowButton } from '@/components/ui';
import {
  ProjectDetailHero,
  ProjectFacts,
  ProjectUpdates,
  ProjectsError,
  ProjectsSkeleton,
} from '@/features/projects';
import { useProject, useFollowProject } from '@/api/hooks';
import { useAuth } from '@/auth';
import { projectDetail, resolveProjectHeroImage } from '@/data/projects';

/** Extra bottom padding so the scrollable content clears the sticky `FollowButton` bar. */
const STICKY_CONTENT_PADDING = 96;

/**
 * Detalle de proyecto `/projects/[id]` (pantalla que la web no tiene, disenada
 * dentro del sistema segun `pantallas-nuevas.md`, seccion "Detalle de
 * proyecto"). Molde de ruta calcado de `app/zone/[slug].tsx`: mismo criterio
 * de "no encontrado" (404 real del servidor, `ApiError.status === 404`, no
 * "no esta en un array local") y de pending/error.
 *
 * Layout: `Screen` es un `ScrollView` (`src/components/layout/Screen.tsx`),
 * asi que el CTA fijo de abajo no puede ir dentro de el (hallazgo 9 del
 * plan). Por eso aca `scroll={false}` y un `ScrollView` propio conviven con
 * el `FollowButton` como hermano absoluto, ambos hijos directos del `View`
 * `flex-1` que arma `Screen` en su variante sin scroll.
 */
export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isPending, isError, error, refetch } = useProject(id);
  const { status } = useAuth();
  const { follow, unfollow } = useFollowProject();
  const insets = useSafeAreaInsets();

  // D1 (plan `20260823-mobile-projects-and-about.plan.md`): the contract
  // never exposes whether the current user already follows a project
  // (`ProjectWithUpdates` has no such field), so this is optimistic and
  // local -- it always starts unfollowed on mount and only flips once the
  // mutation below actually succeeds.
  const [following, setFollowing] = useState(false);

  const handleBack = () => router.back();

  const handleToggleFollow = () => {
    if (status === 'guest') {
      Alert.alert(projectDetail.loginRequiredTitle, projectDetail.loginRequiredBody, [
        { text: projectDetail.loginRequiredOk },
      ]);
      // TODO(item 09): once `app/(auth)/login.tsx` exists, replace the alert
      // above with `router.push(loginHref(pathname))` (`src/auth/routes.ts`)
      // so a guest lands back here after signing in. Calling `loginHref` now
      // would push a route `.expo/types/router.d.ts` does not know yet and
      // land on "Unmatched Route" -- that screen does not exist yet.
      return;
    }
    if (!id) return;
    const mutation = following ? unfollow : follow;
    mutation.mutate(id, { onSuccess: () => setFollowing((wasFollowing) => !wasFollowing) });
  };

  // The 404 the server raises for an unknown id (`PROJECT_NOT_FOUND`,
  // `apps/api/src/modules/projects/application/projects.service.ts`), not
  // "not in the local array" -- this is the source of truth now.
  const notFound = isError && error instanceof ApiError && error.status === 404;

  if (notFound) {
    return (
      <Screen statusBar="dark" bg="bg-cream" scroll={false}>
        <View className="flex-1 items-center justify-center gap-6 px-5">
          <Text className="text-3xl font-bold text-gray-900">{projectDetail.notFoundTitle}</Text>
          <Button variant="dark" label={projectDetail.back} onPress={handleBack} />
        </View>
      </Screen>
    );
  }

  if (isPending) {
    return (
      <Screen statusBar="dark" bg="bg-cream" scroll={false}>
        <ProjectsSkeleton />
      </Screen>
    );
  }

  if (isError || !project) {
    return (
      <Screen statusBar="dark" bg="bg-cream" scroll={false}>
        <ProjectsError onRetry={refetch} />
      </Screen>
    );
  }

  const heroImage = resolveProjectHeroImage(project.coverKey);
  const followDisabled = status === 'loading' || follow.isPending || unfollow.isPending;

  return (
    <Screen statusBar="light" bg="bg-cream" scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: STICKY_CONTENT_PADDING + insets.bottom }}
      >
        <ProjectDetailHero
          title={project.title}
          image={heroImage}
          zoneName={project.zone?.name}
          onBack={handleBack}
        />
        <ProjectFacts
          progress={project.progress}
          lat={project.lat}
          lng={project.lng}
          targetDate={project.targetDate}
          className="bg-white px-5 py-10"
        />
        <ProjectUpdates updates={project.updates} />
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 items-center bg-cream px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <FollowButton
          following={following}
          onPress={handleToggleFollow}
          disabled={followDisabled}
        />
      </View>
    </Screen>
  );
}
