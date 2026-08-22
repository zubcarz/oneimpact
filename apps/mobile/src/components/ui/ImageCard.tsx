import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { overlay } from '@/theme/overlays';
import { Chip } from './Chip';
import { cx } from './cx';

export interface ImageCardProps {
  /** Copia visible, en espanol. */
  title: string;
  image: ImageSource | number;
  onPress?: (event: GestureResponderEvent) => void;
  /** Ancho en px; el alto se deriva del aspect ratio 3/4. */
  width: number;
  chipLabel?: string;
  className?: string;
  testID?: string;
}

/** Tarjeta de zona/home con foto a sangre y gradiente (`componentes.md`). */
export function ImageCard({
  title,
  image,
  onPress,
  width,
  chipLabel,
  className,
  testID,
}: ImageCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      testID={testID}
      className={cx('overflow-hidden rounded-2xl', className)}
      style={{ width, aspectRatio: 3 / 4 }}
    >
      <Image
        source={image}
        contentFit="cover"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={[overlay.transparent, overlay.transparent, overlay.black80]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View className="absolute bottom-0 left-0 right-0 p-5">
        <Text className="mb-3 text-2xl font-black text-white">{title}</Text>
        <Chip label={chipLabel} />
      </View>
    </Pressable>
  );
}
