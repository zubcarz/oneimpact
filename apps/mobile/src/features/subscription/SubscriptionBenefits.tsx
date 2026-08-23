import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import {
  AcademyIcon,
  EmergencyIcon,
  IPassIcon,
  JourneyIcon,
  ProjectsIcon,
  WalletIcon,
} from '@/components/icons/benefits';
import { BenefitItem } from '@/components/ui';
import { BENEFITS, subscriptionScreen, type BenefitCopy } from '@/data/subscription';

/**
 * Mapa `id -> icono` exhaustivo por tipo: si se agrega un `BenefitCopy['id']`
 * sin su icono, el typecheck lo detecta (Record exige las 6 claves).
 */
const BENEFIT_ICONS: Record<BenefitCopy['id'], ReactNode> = {
  ipass: <IPassIcon />,
  proyectos: <ProjectsIcon />,
  travesia: <JourneyIcon />,
  academy: <AcademyIcon />,
  wallet: <WalletIcon />,
  emergencias: <EmergencyIcon />,
};

/**
 * Seccion 3 de Suscripcion: lista de beneficios (`pantallas/suscripcion.md`
 * #3). Presentacional: sin estado, sin hooks de red.
 */
export function SubscriptionBenefits() {
  return (
    <View className="bg-cream px-5 pb-16 pt-2">
      <Text className="mb-6 text-2xl font-bold text-gray-900">
        {subscriptionScreen.benefitsTitle}
      </Text>
      <View className="gap-5">
        {BENEFITS.map((benefit) => (
          <BenefitItem
            key={benefit.id}
            icon={BENEFIT_ICONS[benefit.id]}
            title={benefit.title}
            description={benefit.description}
          />
        ))}
      </View>
    </View>
  );
}
