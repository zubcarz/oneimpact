import type { ReactNode } from 'react';
import { View } from 'react-native';
import { EmergencyIcon, IPassIcon, ProjectsIcon } from '@/components/icons/benefits';
import { BenefitItem } from '@/components/ui';
import { aboutPillars, type AboutPillar } from '@/data/about';

/**
 * Mapa `icon -> componente` exhaustivo por tipo, mismo patron que
 * `SubscriptionBenefits.tsx:18-25`: si se agrega un `AboutPillar['icon']` sin
 * su icono, el typecheck lo detecta (Record exige las tres claves).
 */
const PILLAR_ICONS: Record<AboutPillar['icon'], ReactNode> = {
  projects: <ProjectsIcon />,
  shield: <EmergencyIcon />,
  identity: <IPassIcon />,
};

/**
 * Seccion blanca de "Quienes somos": 3 bloques icono 40px + texto
 * (`pantallas-nuevas.md:19`). Reutiliza `BenefitItem` (fila icono + texto,
 * `src/components/ui/BenefitItem.tsx`) tal cual: su forma -- icono 40x40 a la
 * izquierda, titulo `font-bold` + descripcion `text-gray-500` a la derecha --
 * es exactamente lo que pide el spec, sin nada de Suscripcion (lista de
 * `BENEFITS`) que no aplique aca. Presentacional: sin estado, sin hooks de red.
 */
export function AboutPillars() {
  return (
    <View className="bg-white px-5 py-16">
      <View className="gap-8">
        {aboutPillars.map((pillar) => (
          <BenefitItem
            key={pillar.icon}
            icon={PILLAR_ICONS[pillar.icon]}
            title={pillar.title}
            description={pillar.description}
          />
        ))}
      </View>
    </View>
  );
}
