import { Text, View } from 'react-native';
import type { Billing, PlanId } from '@oneimpact/shared';
import { Button, BillingToggle, PlanSelector } from '@/components/ui';
import { subscriptionScreen } from '@/data/subscription';

export interface SubscriptionPlansProps {
  billing: Billing;
  selectedPlan: PlanId;
  onBillingChange: (value: Billing) => void;
  onPlanChange: (value: PlanId) => void;
  onCtaPress: () => void;
}

/**
 * Seccion 2 de Suscripcion: hero + selector de ciclo y plan
 * (`pantallas/suscripcion.md` #2). Presentacional: el estado de
 * `billing`/`selectedPlan` vive en la pantalla, no aca.
 */
export function SubscriptionPlans({
  billing,
  selectedPlan,
  onBillingChange,
  onPlanChange,
  onCtaPress,
}: SubscriptionPlansProps) {
  return (
    <View className="bg-cream px-5 pb-8 pt-10">
      <Text className="mb-2 text-3xl font-bold leading-tight text-gray-900">
        {subscriptionScreen.heroTitle}
      </Text>
      <Text className="mb-8 text-base text-gray-500">{subscriptionScreen.heroSubtitle}</Text>
      <BillingToggle value={billing} onChange={onBillingChange} className="mb-6" />
      <PlanSelector
        value={selectedPlan}
        billing={billing}
        onChange={onPlanChange}
        className="mb-5"
      />
      <Button
        label={subscriptionScreen.ctaLabel}
        onPress={onCtaPress}
        variant="dark"
        size="lg"
        fullWidth
      />
      <Text className="mt-3 text-center text-xs text-gray-400">
        {subscriptionScreen.disclaimer}
      </Text>
    </View>
  );
}
