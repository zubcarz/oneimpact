import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import { ProjectStatus } from '@oneimpact/shared';
import type { ProjectCardView } from '@/data/projects';
import { ProgressBar } from './ProgressBar';
import { cx } from './cx';

export interface ProjectCardProps {
  project: ProjectCardView;
  onPress?: (event: GestureResponderEvent) => void;
  className?: string;
  testID?: string;
}

const IMAGE_FILL = { width: '100%', height: '100%' } as const;

/** Colores del badge de estado por `ProjectStatus` (spec pantallas-nuevas.md, Proyectos). */
const STATUS_BADGE_CLASSES: Record<ProjectStatus, { container: string; text: string }> = {
  [ProjectStatus.ACTIVE]: { container: 'bg-accent', text: 'text-gray-900' },
  [ProjectStatus.PLANNED]: { container: 'bg-gray-200', text: 'text-gray-700' },
  [ProjectStatus.COMPLETED]: { container: 'bg-forest', text: 'text-white' },
};

/**
 * Tarjeta de proyecto de la pagina Proyectos (`pantallas-nuevas.md`, seccion
 * "Proyectos (`/projects`) -- publica"). Recibe una `ProjectCardView` ya resuelta
 * por `src/data/projects.ts`: `statusLabel` viene traducido, no se retraduce aca.
 * Cuando `image` es `undefined` (sin `coverKey` mapeado) cae a un placeholder
 * `bg-cream`; la card nunca desaparece por falta de foto.
 */
export function ProjectCard({ project, onPress, className, testID }: ProjectCardProps) {
  const { title, summary, status, statusLabel, progress, image, zoneName } = project;
  const badge = STATUS_BADGE_CLASSES[status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      testID={testID}
      className={cx('rounded-3xl bg-white p-3 shadow-sm active:opacity-90', className)}
    >
      <View className="h-40 overflow-hidden rounded-2xl">
        {image !== undefined ? (
          <Image source={image} contentFit="cover" style={IMAGE_FILL} />
        ) : (
          <View className="h-40 w-full rounded-2xl bg-cream" />
        )}
        {zoneName !== undefined ? (
          <View className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1">
            <Text className="text-xs font-bold text-gray-900">{zoneName}</Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-3 text-lg font-bold text-gray-900" numberOfLines={2}>
        {title}
      </Text>

      <Text className="mt-1 text-sm text-gray-500" numberOfLines={2}>
        {summary}
      </Text>

      <View className="mt-3 flex-row items-center gap-3">
        <ProgressBar value={progress} className="flex-1" />
        <Text className="text-xs font-bold text-gray-900">{`${Math.round(progress)}%`}</Text>
        <View className={cx('rounded-full px-3 py-1', badge.container)}>
          <Text className={cx('text-xs font-bold', badge.text)}>{statusLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}
