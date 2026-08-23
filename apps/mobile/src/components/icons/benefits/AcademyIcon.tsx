import Svg, { Rect, Polygon, Path, Line } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

export interface AcademyIconProps {
  size?: number;
}

/**
 * Icono de beneficio "Academy" (`02-Analisis-Visual/svg/beneficio-academy.svg`).
 * Copiado tal cual del vault; decorativo, el texto del beneficio ya lo nombra.
 */
export function AcademyIcon({ size = 40 }: AcademyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width={40} height={40} rx={8} fill={colors.darkGreen} />
      <Polygon points="20,10 32,16 20,22 8,16" fill={colors.white} />
      <Path
        d="M14 19 L14 27 C16.5 29 23.5 29 26 27 L26 19"
        stroke={colors.white}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
      <Line
        x1={32}
        y1={16}
        x2={32}
        y2={24}
        stroke={colors.white}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
