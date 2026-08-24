import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Screen } from '@/components/layout';
import { IPassCard, ProfileMenu, SubscriptionRow } from '@/features/profile';
import { useCancelSubscription, useDashboard } from '@/api/hooks';
import { useAuth } from '@/auth';

/**
 * `/(app)/admin` llega en la Fase 5 de este plan: `.expo/types/router.d.ts`
 * todavia no tiene una entrada para esta ruta, asi que `Href` -- estricto
 * bajo `typedRoutes` (`apps/mobile/app.json`) -- no puede verificarla. Mismo
 * patron aislado que `app/(auth)/register.tsx:16`.
 */
const ADMIN_PATH = '/(app)/admin';

/**
 * Pantalla de Perfil / iPass (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`,
 * "Perfil / iPass (`/(app)/profile`)"). Compone la tarjeta iPass, la gestion
 * de suscripcion y el menu -- todas presentacionales -- sobre `useAuth` (perfil)
 * y `useDashboard` (plan/status/notificaciones sin leer, ya resuelto por el
 * summary desde la Fase 1: esta pantalla no vuelve a llamar `useSubscription`).
 */
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const dashboardQuery = useDashboard();
  const cancelSubscription = useCancelSubscription();

  const dashboard = dashboardQuery.data;
  const shortId = user ? user.id.slice(0, 8) : '';

  return (
    <Screen bg="bg-cream">
      <View className="gap-5 px-5 py-6">
        <Text className="text-2xl font-bold text-gray-900" accessibilityRole="header">
          Perfil
        </Text>
        {user ? <IPassCard name={user.name} shortId={shortId} /> : null}
        <SubscriptionRow
          plan={dashboard?.plan ?? null}
          status={dashboard?.status ?? null}
          onCancel={() => cancelSubscription.mutate()}
          isCanceling={cancelSubscription.isPending}
        />
        {user ? (
          <ProfileMenu
            role={user.role}
            unreadNotifications={dashboard?.unreadNotifications ?? 0}
            onSignOut={signOut}
            onAdminPress={() => router.push(ADMIN_PATH as Href)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
