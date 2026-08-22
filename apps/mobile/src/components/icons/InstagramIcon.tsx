import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

export interface InstagramIconProps {
  size?: number;
  color?: string;
}

/**
 * Icono de Instagram dibujado con `react-native-svg` (ya es dependencia del
 * proyecto). `lucide-react-native` no incluye iconos de marca, asi que este
 * glifo geometrico (mismo stroke width 2 que el resto de iconos lucide del
 * sistema) cubre el hueco sin sumar una dependencia nueva.
 */
export function InstagramIcon({ size = 20, color = colors.white }: InstagramIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
      <Circle cx={17.5} cy={6.5} r={1} fill={color} />
    </Svg>
  );
}
