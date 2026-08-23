import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

export interface ProjectsIconProps {
  size?: number;
}

/**
 * Icono de beneficio "Proyectos" (`02-Analisis-Visual/svg/beneficio-proyectos.svg`).
 * Copiado tal cual del vault; decorativo, el texto del beneficio ya lo nombra.
 */
export function ProjectsIcon({ size = 40 }: ProjectsIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width={40} height={40} rx={8} fill={colors.darkGreen} />
      <Path
        d="M20 10 C16 10 13 13 13 17 C13 22.5 20 31 20 31 C20 31 27 22.5 27 17 C27 13 24 10 20 10Z"
        stroke={colors.white}
        strokeWidth={1.5}
        fill="none"
      />
      <Circle cx={20} cy={17} r={2.5} fill={colors.white} />
    </Svg>
  );
}
