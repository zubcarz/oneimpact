import { useState } from 'react';
import { router } from 'expo-router';
import type { Billing, PlanId } from '@oneimpact/shared';
import { Header, FullScreenMenu, Screen } from '@/components/layout';
import {
  SubscriptionBenefits,
  SubscriptionCollage,
  SubscriptionPlans,
} from '@/features/subscription';

export default function SubscriptionScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [billing, setBilling] = useState<Billing>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('estandar');

  const handleCtaPress = () => {
    router.push({
      pathname: '/(auth)/register',
      params: { plan: selectedPlan, billing },
    });
  };

  return (
    <Screen statusBar="light" bg="bg-cream">
      <Header logo="white" onMenuPress={() => setMenuOpen(true)} />
      <FullScreenMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <SubscriptionCollage />
      <SubscriptionPlans
        billing={billing}
        selectedPlan={selectedPlan}
        onBillingChange={setBilling}
        onPlanChange={setSelectedPlan}
        onCtaPress={handleCtaPress}
      />
      <SubscriptionBenefits />
    </Screen>
  );
}
