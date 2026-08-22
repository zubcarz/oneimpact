import { useState } from 'react';
import { Footer, Header, FullScreenMenu, Screen } from '@/components/layout';
import { AdvancesCarousel, ZonesHero, ZonesList } from '@/features/zones';

export default function ZonesScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Screen statusBar="dark" bg="bg-cream">
      <Header logo="black" onMenuPress={() => setMenuOpen(true)} />
      <FullScreenMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <ZonesHero />
      <ZonesList />
      <AdvancesCarousel />
      <Footer />
    </Screen>
  );
}
