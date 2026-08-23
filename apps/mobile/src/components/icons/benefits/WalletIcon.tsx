import Svg, { Rect, Path } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

export interface WalletIconProps {
  size?: number;
}

/**
 * Icono de beneficio "Wallet" (`02-Analisis-Visual/svg/beneficio-wallet.svg`).
 * Copiado tal cual del vault; decorativo, el texto del beneficio ya lo nombra.
 */
export function WalletIcon({ size = 40 }: WalletIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
      <Rect width={40} height={40} rx={8} fill={colors.darkGreen} />
      <Rect
        x={8}
        y={14}
        width={24}
        height={16}
        rx={3}
        stroke={colors.white}
        strokeWidth={1.5}
        fill="none"
      />
      <Path d="M8 20 L32 20" stroke={colors.white} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x={24} y={22} width={6} height={5} rx={2} fill={colors.white} />
      <Path d="M12 14 L15 10" stroke={colors.white} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M19 14 L22 10" stroke={colors.white} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
