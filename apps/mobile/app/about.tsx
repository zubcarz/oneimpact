import { useState } from 'react';
import { router } from 'expo-router';
import { FullScreenMenu, Screen } from '@/components/layout';
import { AboutCta, AboutHero, AboutPillars } from '@/features/about';

/**
 * "Quienes somos" `/about` (pantalla que la web no tiene; disenada dentro del
 * sistema segun `pantallas-nuevas.md`, seccion "Quienes somos"). Ritmo de
 * fondos oscuro -> blanco -> lima (`60-design-system.md`).
 */
export default function AboutScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  // `/about` se alcanza desde el menu full-screen, que puede abrirse desde
  // cualquier pantalla: `back()` respeta de donde vino. Si no hay historial
  // (deep link, recarga en web) cae a Inicio en vez de dejar un boton muerto.
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <Screen statusBar="light" bg="bg-cream">
      <FullScreenMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <AboutHero onMenuPress={() => setMenuOpen(true)} onBack={handleBack} />
      <AboutPillars />
      <AboutCta />
    </Screen>
  );
}
