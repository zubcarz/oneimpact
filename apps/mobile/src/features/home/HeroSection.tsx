import { Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, type Href } from 'expo-router';
import { Button } from '@/components/ui';
import { overlay } from '@/theme/overlays';
import { hero, heroPoster, heroVideo } from '@/data/home';

export interface HeroSectionProps {
  /** Por defecto navega a `hero.ctaHref`; se puede sobreescribir para tests. */
  onExplore?: () => void;
}

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Seccion 1 de Inicio: video hero a pantalla completa (`pantallas/inicio.md` #1). */
export function HeroSection({ onExplore }: HeroSectionProps) {
  const { height } = useWindowDimensions();
  const player = useVideoPlayer(heroVideo, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  const handleExplore = () => {
    if (onExplore) {
      onExplore();
      return;
    }
    router.push(hero.ctaHref as Href);
  };

  return (
    <View className="bg-black" style={{ height }}>
      <Image source={heroPoster} contentFit="cover" style={ABSOLUTE_FILL} />
      <VideoView
        player={player}
        style={ABSOLUTE_FILL}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[overlay.black60, overlay.black20, overlay.black70]}
        style={ABSOLUTE_FILL}
      />
      <View className="flex-1 justify-end px-4 pb-16">
        <Text className="mb-4 text-4xl font-black leading-tight text-white">{hero.title}</Text>
        <Text className="mb-8 max-w-md text-base text-white/80">{hero.subtitle}</Text>
        <Button label={hero.cta} variant="white" className="self-start" onPress={handleExplore} />
      </View>
    </View>
  );
}
