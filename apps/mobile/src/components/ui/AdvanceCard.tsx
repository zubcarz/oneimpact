import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { cx } from './cx';

export interface AdvanceCardProps {
  /** Copia visible, en espanol. */
  title: string;
  /** Copia visible, en espanol. */
  body: string;
  image: number;
  year: number;
  className?: string;
  testID?: string;
}

const IMAGE_FILL = { width: '100%', height: '100%' } as const;

/**
 * Tarjeta de avance del carrusel "Avances desde el territorio" (`componentes.md`).
 * Presentacional pura: se usa sobre fondo forest, de ahi los blancos translucidos.
 */
export function AdvanceCard({ title, body, image, year, className, testID }: AdvanceCardProps) {
  return (
    <View className={cx('w-[220px]', className)} testID={testID}>
      <View className="mb-3 h-48 w-full overflow-hidden rounded-2xl">
        <Image source={image} contentFit="cover" style={IMAGE_FILL} />
      </View>
      <Text className="text-sm font-bold text-accent" numberOfLines={2}>
        {title}
      </Text>
      <Text className="text-xs text-white/50">{`· ${year}`}</Text>
      <Text className="text-xs leading-relaxed text-white/80" numberOfLines={4}>
        {body}
      </Text>
    </View>
  );
}
