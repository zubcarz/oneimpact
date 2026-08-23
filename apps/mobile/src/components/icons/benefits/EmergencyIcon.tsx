import Svg, { Rect, Path, Line } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

export interface EmergencyIconProps {
  size?: number;
}

/**
 * Icono de beneficio "Emergencias" (`02-Analisis-Visual/svg/beneficio-emergencias.svg`).
 * Copiado tal cual del vault; decorativo, el texto del beneficio ya lo nombra.
 */
export function EmergencyIcon({ size = 40 }: EmergencyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width={40} height={40} rx={8} fill={colors.darkGreen} />
      <Path
        d="M20 10 L29 14 L29 22 C29 27.5 20 32 20 32 C20 32 11 27.5 11 22 L11 14 Z"
        stroke={colors.white}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
      <Line
        x1={20}
        y1={17}
        x2={20}
        y2={24}
        stroke={colors.white}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Line
        x1={16.5}
        y1={20.5}
        x2={23.5}
        y2={20.5}
        stroke={colors.white}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
