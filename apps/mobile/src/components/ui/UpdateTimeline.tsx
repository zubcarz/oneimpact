import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ProjectUpdate } from '@oneimpact/shared';
import { assetForKey } from '@/data/zones';
import { cx } from './cx';

export interface UpdateTimelineProps {
  /** Avances de un proyecto; se ordenan por `publishedAt` descendente adentro del componente. */
  items: ProjectUpdate[];
  className?: string;
  testID?: string;
}

const IMAGE_FILL = { width: '100%', height: '100%' } as const;

/** Fecha larga en espanol, ej. "3 de marzo de 2026". */
function formatPublishedAt(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Linea de tiempo de avances del detalle de proyecto (`pantallas-nuevas.md`).
 * Presentacional: recibe `items` por props y va sobre fondo forest (lo pone
 * `ProjectUpdates`, no este componente).
 */
export function UpdateTimeline({ items, className, testID }: UpdateTimelineProps) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <View className={cx('gap-6', className)} testID={testID}>
      {sorted.map((item, index) => {
        const image = item.mediaKey ? assetForKey(item.mediaKey) : undefined;
        const isLast = index === sorted.length - 1;

        return (
          <View key={item.id} className="flex-row gap-4">
            <View className="w-3 items-center">
              <View className="h-3 w-3 rounded-full bg-accent" />
              {!isLast ? <View className="mt-1 w-px flex-1 bg-accent/40" /> : null}
            </View>
            <View className="flex-1 pb-2">
              <Text className="text-xs text-white/50">{formatPublishedAt(item.publishedAt)}</Text>
              <Text className="mt-1 text-sm font-bold text-accent">{item.title}</Text>
              <Text className="mt-1 text-xs text-white/80">{item.body}</Text>
              {image !== undefined ? (
                <View className="mt-3 h-40 w-full overflow-hidden rounded-2xl">
                  <Image source={image} contentFit="cover" style={IMAGE_FILL} />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
