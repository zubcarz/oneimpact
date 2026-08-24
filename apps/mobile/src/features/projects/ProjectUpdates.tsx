import { Text, View } from 'react-native';
import type { ProjectUpdate } from '@oneimpact/shared';
import { SectionHeader, UpdateTimeline } from '@/components/ui';
import { projectDetail } from '@/data/projects';

export interface ProjectUpdatesProps {
  updates: ProjectUpdate[];
}

/**
 * Seccion forest "Avances" del detalle de proyecto (`pantallas-nuevas.md`,
 * "Detalle de proyecto"): envuelve `UpdateTimeline` con el mismo header que el
 * resto de secciones oscuras (`SectionHeader tone="dark"`). Presentacional:
 * recibe `updates` por props, sin hooks de red -- la ruta (`app/projects/[id].tsx`)
 * ya resolvio `useProject(id)`.
 */
export function ProjectUpdates({ updates }: ProjectUpdatesProps) {
  return (
    <View className="bg-forest px-5 py-14">
      <SectionHeader
        title={projectDetail.updatesTitle}
        tone="dark"
        weight="bold"
        className="mb-8"
      />
      {updates.length > 0 ? (
        <UpdateTimeline items={updates} />
      ) : (
        <View>
          <Text className="mb-2 text-lg font-bold text-white">
            {projectDetail.updatesEmptyTitle}
          </Text>
          <Text className="text-sm leading-relaxed text-white/70">
            {projectDetail.updatesEmptyBody}
          </Text>
        </View>
      )}
    </View>
  );
}
