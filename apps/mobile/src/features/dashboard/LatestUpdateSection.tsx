import { Text, View } from 'react-native';
import type { ProjectUpdate } from '@oneimpact/shared';
import { SectionHeader, UpdateTimeline } from '@/components/ui';

export interface LatestUpdateSectionProps {
  update: ProjectUpdate | undefined;
  projectTitle: string | undefined;
}

/**
 * Seccion forest "Ultimo avance" del Dashboard: un unico `UpdateTimeline`
 * item del proyecto seguido mas reciente (`pantallas-nuevas.md`, "Dashboard",
 * linea 43). Sin avance, la seccion no renderiza nada -- no hay un estado
 * vacio propio para esta pieza del Dashboard.
 */
export function LatestUpdateSection({ update, projectTitle }: LatestUpdateSectionProps) {
  if (!update) {
    return null;
  }

  return (
    <View className="bg-forest px-5 py-14">
      <SectionHeader title="Último avance" tone="dark" weight="bold" className="mb-2" />
      {projectTitle !== undefined ? (
        <Text className="mb-8 text-sm font-bold text-accent">{projectTitle}</Text>
      ) : (
        <View className="mb-8" />
      )}
      <UpdateTimeline items={[update]} />
    </View>
  );
}
