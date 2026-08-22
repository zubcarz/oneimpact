import { Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { cx } from './cx';

export interface GlassCardProps {
  /** Copia visible, en espanol. */
  title: string;
  subtitle?: string;
  className?: string;
  testID?: string;
}

const CARD_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Tarjeta glass de testimonio (`componentes.md`). */
export function GlassCard({ title, subtitle, className, testID }: GlassCardProps) {
  return (
    <View
      className={cx('overflow-hidden rounded-2xl border border-white/50 bg-white/20', className)}
      testID={testID}
    >
      <BlurView intensity={30} tint="light" style={CARD_FILL} />
      <View className="px-4 py-3">
        <Text className="text-sm font-semibold text-white">{title}</Text>
        {subtitle ? <Text className="text-[11px] text-white/80">{subtitle}</Text> : null}
      </View>
    </View>
  );
}
