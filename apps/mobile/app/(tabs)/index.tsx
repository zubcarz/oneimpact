import { useState } from 'react';
import { Footer, Header, FullScreenMenu, Screen } from '@/components/layout';
import { HeroSection, VideoSection } from '@/features/home';

export default function IndexScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Screen statusBar="light" bg="bg-white">
      <Header logo="white" onMenuPress={() => setMenuOpen(true)} />
      <FullScreenMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <HeroSection />
      <VideoSection />
      <Footer />
    </Screen>
  );
}
