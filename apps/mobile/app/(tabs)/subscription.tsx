import { useState } from 'react';
import { Alert } from 'react-native';
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
    // TODO(item 09): navegar a `/(auth)/register?plan=<id>&billing=<billing>`
    // cuando esa ruta exista. Por ahora `/(auth)/register` no esta creada.
    Alert.alert('Proximamente', 'El registro estara disponible muy pronto.');
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
