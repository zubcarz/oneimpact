import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Button } from '@/components/ui';
import { AlliesSection } from '@/features/home';
import { aboutCta } from '@/data/about';

/**
 * Seccion lima de "Quienes somos": aliados (reutiliza `AlliesSection` de Home
 * con `bgClassName="bg-accent-light"`) + CTA "Quiero hacer parte"
 * (`pantallas-nuevas.md:20`). Presentacional salvo la navegacion del boton.
 */
export function AboutCta() {
  const handlePress = () => router.push(aboutCta.href as Href);

  return (
    <View className="bg-accent-light">
      <AlliesSection bgClassName="bg-accent-light" />
      <View className="px-5 pb-16">
        <Button variant="dark" size="lg" fullWidth label={aboutCta.label} onPress={handlePress} />
      </View>
    </View>
  );
}
