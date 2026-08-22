import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

export interface JourneyIconProps {
  size?: number;
}

/**
 * Icono de beneficio "Travesia" (`02-Analisis-Visual/svg/beneficio-travesia.svg`).
 * Copiado tal cual del vault; decorativo, el texto del beneficio ya lo nombra.
 */
export function JourneyIcon({ size = 40 }: JourneyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      <Rect width={40} height={40} rx={8} fill={colors.darkGreen} />
      <Path
        d="M9 28 C13 28 13 20 20 20 S27 12 31 12"
        stroke={colors.white}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={9} cy={28} r={2.5} fill={colors.white} />
      <Circle cx={20} cy={20} r={2.5} fill={colors.white} />
      <Circle cx={31} cy={12} r={2.5} fill={colors.white} />
    </Svg>
  );
}
