import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

export interface IPassIconProps {
  size?: number;
}

/**
 * Icono de beneficio "iPass" (`02-Analisis-Visual/svg/beneficio-ipass.svg`).
 * Copiado tal cual del vault; decorativo, el texto del beneficio ya lo nombra.
 */
export function IPassIcon({ size = 40 }: IPassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      <Rect width={40} height={40} rx={8} fill={colors.darkGreen} />
      <Rect
        x={8}
        y={12}
        width={24}
        height={18}
        rx={3}
        stroke={colors.white}
        strokeWidth={1.5}
        fill="none"
      />
      <Circle cx={15} cy={20} r={3} fill={colors.white} />
      <Line
        x1={22}
        y1={18}
        x2={29}
        y2={18}
        stroke={colors.white}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Line
        x1={22}
        y1={22}
        x2={27}
        y2={22}
        stroke={colors.white}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
