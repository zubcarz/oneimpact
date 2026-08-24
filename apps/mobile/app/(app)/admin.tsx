import { Text, View } from 'react-native';
import { useRequireRole } from '@/auth';
import { useProjects } from '@/api/hooks';
import { Screen } from '@/components/layout';
import { Button, SectionHeader } from '@/components/ui';
import { AdminProjectsList } from '@/features/admin';

/**
 * Atajo admin (`02-Analisis-Visual/pantallas/pantallas-nuevas.md`, "Admin
 * (mobile, solo rol admin) (`/(app)/admin`)"): lista de proyectos en
 * cualquier estado con un boton "Publicar avance" por fila. Es un atajo -- el
 * admin completo es la web (`apps/admin`). Solo esta pantalla llama hooks de
 * red; `AdminProjectsList`/`PublishUpdateForm` son presentacionales.
 *
 * `useRequireRole('ADMIN')` ya dispara el redirect (login para un invitado,
 * `/(tabs)` para un `USER` autenticado) -- esta pantalla no agrega logica de
 * navegacion propia, solo deja de renderizar mientras `hasAccess` es `false`.
 */
export default function AdminScreen() {
  const hasAccess = useRequireRole('ADMIN');
  const projectsQuery = useProjects();

  if (!hasAccess) return null;

  if (projectsQuery.isPending) {
    return (
      <Screen bg="bg-cream" scroll={false}>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-sm text-gray-500">Cargando proyectos...</Text>
        </View>
      </Screen>
    );
  }

  if (projectsQuery.isError) {
    return (
      <Screen bg="bg-cream" scroll={false}>
        <View className="flex-1 items-center justify-center gap-4 px-5">
          <Text className="text-center text-xl font-bold text-gray-900">
            No pudimos cargar los proyectos
          </Text>
          <Text className="text-center text-sm text-gray-600">
            Revisa tu conexión e intenta de nuevo.
          </Text>
          <Button label="Reintentar" variant="dark" onPress={() => projectsQuery.refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="bg-cream">
      <View className="px-5 py-6">
        <SectionHeader
          title="Panel admin"
          subtitle="Publica un avance corto para cualquier proyecto."
          weight="bold"
        />
      </View>
      <AdminProjectsList
        projects={projectsQuery.data.items}
        onPublishSuccess={() => projectsQuery.refetch()}
      />
    </Screen>
  );
}
