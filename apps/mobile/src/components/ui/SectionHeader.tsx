import { Text, View } from 'react-native';
import { cx } from './cx';

export type SectionHeaderAlign = 'left' | 'center';
export type SectionHeaderTone = 'light' | 'dark';
export type SectionHeaderWeight = 'black' | 'bold';

export interface SectionHeaderProps {
  /** Copia visible, en espanol. */
  title: string;
  subtitle?: string;
  align?: SectionHeaderAlign;
  /** `dark` es para fondos oscuros (avances): titulo blanco, subtitulo `white/70`. */
  tone?: SectionHeaderTone;
  /** Home usa 900 (`black`, default); Zonas/Suscripcion usan 700 (`bold`). */
  weight?: SectionHeaderWeight;
  titleClassName?: string;
  className?: string;
}

/** Encabezado de seccion del sistema de diseno (`componentes.md`). */
export function SectionHeader({
  title,
  subtitle,
  align = 'left',
  tone = 'light',
  weight = 'black',
  titleClassName,
  className,
}: SectionHeaderProps) {
  const isCenter = align === 'center';
  const isDark = tone === 'dark';

  return (
    <View className={cx(isCenter && 'items-center', className)}>
      <Text
        className={cx(
          'text-3xl leading-tight mb-3',
          weight === 'black' ? 'font-black' : 'font-bold',
          isDark ? 'text-white' : 'text-gray-900',
          isCenter && 'text-center',
          titleClassName,
        )}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className={cx(
            'text-base max-w-md',
            isDark ? 'text-white/70' : 'text-gray-500',
            isCenter && 'text-center',
          )}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
