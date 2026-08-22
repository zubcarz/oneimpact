import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, type Href } from 'expo-router';
import { Button, PlayButton, SectionHeader } from '@/components/ui';
import { heroVideo, videoSection, videoThumbnail } from '@/data/home';

const ABSOLUTE_FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Seccion 2 de Inicio: "Conoce que es One Impact" (`pantallas/inicio.md` #2). */
export function VideoSection() {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(heroVideo);

  const handlePlay = () => {
    setPlaying(true);
    player.play();
  };

  return (
    <View className="bg-white px-4 py-16">
      <SectionHeader title={videoSection.title} subtitle={videoSection.subtitle} className="mb-8" />
      <View className="mb-8 aspect-video overflow-hidden rounded-2xl bg-gray-900">
        {playing ? (
          <VideoView player={player} style={ABSOLUTE_FILL} contentFit="contain" nativeControls />
        ) : (
          <>
            <Image source={videoThumbnail} contentFit="cover" style={ABSOLUTE_FILL} />
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <PlayButton onPress={handlePlay} accessibilityLabel={videoSection.videoLabel} />
            </View>
          </>
        )}
      </View>
      <Button
        label={videoSection.cta}
        variant="accent"
        className="self-start"
        onPress={() => router.push(videoSection.ctaHref as Href)}
      />
    </View>
  );
}
