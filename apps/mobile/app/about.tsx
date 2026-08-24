import { useState } from 'react';
import { FullScreenMenu, Screen } from '@/components/layout';
import { AboutCta, AboutHero, AboutPillars } from '@/features/about';

/**
 * "Quienes somos" `/about` (pantalla que la web no tiene; disenada dentro del
 * sistema segun `pantallas-nuevas.md`, seccion "Quienes somos"). Ritmo de
 * fondos oscuro -> blanco -> lima (`60-design-system.md`).
 */
export default function AboutScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Screen statusBar="light" bg="bg-cream">
      <FullScreenMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <AboutHero onMenuPress={() => setMenuOpen(true)} />
      <AboutPillars />
      <AboutCta />
    </Screen>
  );
}
