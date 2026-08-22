import Svg, { Path } from 'react-native-svg';
import { colors } from '@oneimpact/ui-tokens';

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/**
 * Los 10 paths bezier del "contorno topografico" decorativo del hero de Zonas
 * (`02-Analisis-Visual/svg/zonas-hero-lineas.svg`). Copiados tal cual del vault.
 */
const TOPO_PATHS: string[] = [
  'M-50 320 C 80 290, 180 260, 300 280 S 480 310, 600 270 S 780 230, 950 260',
  'M-50 295 C 70 260, 170 230, 290 250 S 470 285, 590 245 S 770 200, 950 235',
  'M-50 270 C 60 230, 160 200, 280 220 S 460 260, 580 215 S 760 170, 950 210',
  'M-50 245 C 50 200, 150 170, 270 185 S 450 235, 570 185 S 750 138, 950 180',
  'M-50 218 C 40 170, 140 140, 260 152 S 440 208, 560 152 S 740 105, 950 148',
  'M-50 190 C 30 140, 130 108, 250 118 S 430 180, 550 120 S 728 72, 950 116',
  'M-50 160 C 20 108, 120 74, 240 82 S 420 150, 540 88 S 716 38, 950 82',
  'M-50 128 C 10 74, 110 40, 230 46 S 410 120, 530 56 S 704 4, 950 48',
  'M100 380 C 160 340, 240 310, 320 330 S 460 370, 560 325 S 700 280, 820 310',
  'M-50 350 C 100 330, 220 305, 350 320 S 520 350, 640 310 S 810 265, 950 295',
];

/**
 * Decoracion de fondo del hero de Zonas: 10 curvas bezier tipo "lineas
 * topograficas" (`pantallas/zonas.md` #1). Absoluta, no interactiva.
 */
export function TopoLines() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 900 400"
      preserveAspectRatio="xMidYMid slice"
      opacity={0.12}
      style={FILL}
      pointerEvents="none"
      accessible={false}
    >
      {TOPO_PATHS.map((d) => (
        <Path key={d} d={d} stroke={colors.topoLine} strokeWidth={1.2} fill="none" />
      ))}
    </Svg>
  );
}
