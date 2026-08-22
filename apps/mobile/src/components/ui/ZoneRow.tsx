import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { overlay } from '@/theme/overlays';
import { Chip } from './Chip';
import { cx } from './cx';

export interface ZoneRowProps {
  slug: string;
  /** Copia visible, en espanol. */
  name: string;
  /** Copia visible, en espanol. */
  description: string;
  image: number;
  onPress?: (slug: string) => void;
  chipLabel?: string;
  className?: string;
  testID?: string;
}

const ROW_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Fila de zona de la pagina Zonas (`componentes.md`, seccion ZoneRow). */
export function ZoneRow({
  slug,
  name,
  description,
  image,
  onPress,
  chipLabel,
  className,
  testID,
}: ZoneRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => onPress?.(slug)}
      testID={testID}
      className={cx('h-52 w-full overflow-hidden rounded-3xl active:opacity-90', className)}
    >
      <Image source={image} contentFit="cover" style={ROW_FILL} />
      <LinearGradient
        colors={[overlay.black80, overlay.black30, overlay.transparent]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={ROW_FILL}
      />
      <View className="absolute inset-0 flex-row items-end justify-between gap-4 p-5">
        <View className="flex-1">
          <Text className="text-3xl font-bold text-white">{name}</Text>
          <Text className="text-sm text-white/90" numberOfLines={3}>
            {description}
          </Text>
        </View>
        <Chip variant="zones" label={chipLabel} />
      </View>
    </Pressable>
  );
}
