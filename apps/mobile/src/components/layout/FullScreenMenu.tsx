import { Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ArrowRight, X } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { Button } from '@/components/ui';
import { joinCta, navAccessibilityLabels, navItems, type NavItem } from '@/data/nav';

export interface FullScreenMenuProps {
  visible: boolean;
  onClose: () => void;
}

const LOGO_SOURCE = require('@/assets/images/logo-black.png');
const LOGO_SIZE = { width: 82, height: 32 };

/** Menu full-screen sobre `bg-accent` con fade 200ms (`componentes.md`). */
export function FullScreenMenu({ visible, onClose }: FullScreenMenuProps) {
  const insets = useSafeAreaInsets();

  const navigateTo = (item: NavItem) => {
    onClose();
    router.push(item.href as Href);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 bg-accent px-6 pb-8"
        style={{ paddingTop: insets.top + 20 }}
      >
        <StatusBar style="dark" />
        <View className="flex-row items-center justify-between">
          <Image source={LOGO_SOURCE} contentFit="contain" style={LOGO_SIZE} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={navAccessibilityLabels.closeMenu}
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/10 active:opacity-80"
          >
            <X size={22} color={colors.gray900} />
          </Pressable>
        </View>

        <View className="mt-8">
          {navItems.map((item) => (
            <Pressable
              key={item.href}
              accessibilityRole="link"
              accessibilityLabel={item.label}
              onPress={() => navigateTo(item)}
              className="flex-row items-center justify-between border-b border-black/10 py-5 active:opacity-70"
            >
              <Text className="text-2xl font-bold text-gray-900">{item.label}</Text>
              <ArrowRight size={24} color={colors.gray900} />
            </Pressable>
          ))}
        </View>

        <View className="mt-auto">
          <Button
            label={joinCta.label}
            variant="dark"
            size="lg"
            fullWidth
            onPress={() => navigateTo(joinCta)}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}
