import { Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ArrowRight, X } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { useAuth } from '@/auth';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { Button } from '@/components/ui';
import {
  contactEmail,
  copyright,
  navAccessibilityLabels,
  navItems,
  resolveMenuCta,
  type NavItem,
} from '@/data/nav';

export interface FullScreenMenuProps {
  visible: boolean;
  onClose: () => void;
}

const LOGO_SOURCE = require('@/assets/images/logo-black.png');
const LOGO_SIZE = { width: 82, height: 32 };

/**
 * Menu full-screen sobre `bg-accent` con fade 200ms (`componentes.md`). Ademas
 * de los enlaces y el CTA del spec, aloja el contacto y el copyright que antes
 * vivian en el footer de pagina, retirado por decision de producto.
 */
export function FullScreenMenu({ visible, onClose }: FullScreenMenuProps) {
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const menuCta = resolveMenuCta(status === 'authed');

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
      {/* El fade va en el Animated.View y el estilo en un View normal: NativeWind
          no aplica `className` sobre los componentes de Reanimated, y sin esto el
          menu se dibuja transparente encima de la pantalla. */}
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={FILL}>
        <View className="flex-1 bg-accent px-6 pb-8" style={{ paddingTop: insets.top + 20 }}>
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
                className="flex-row items-center justify-between border-b border-black/10 py-4 active:opacity-70"
              >
                <Text className="text-2xl font-bold text-gray-900">{item.label}</Text>
                <ArrowRight size={24} color={colors.gray900} />
              </Pressable>
            ))}
          </View>

          <View className="mt-auto pt-8">
            <Button
              label={menuCta.label}
              variant="dark"
              size="lg"
              fullWidth
              onPress={() => navigateTo(menuCta)}
            />

            <View className="mt-6 flex-row items-center justify-between border-t border-black/10 pt-5">
              <Text className="text-sm font-bold text-gray-900">{contactEmail}</Text>
              <View className="flex-row gap-1">
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Instagram"
                  className="min-h-[44px] min-w-[44px] items-center justify-center active:opacity-70"
                >
                  <InstagramIcon size={20} color={colors.gray900} />
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="X"
                  className="min-h-[44px] min-w-[44px] items-center justify-center active:opacity-70"
                >
                  <X size={20} color={colors.gray900} />
                </Pressable>
              </View>
            </View>

            <Text className="mt-1 text-xs text-gray-900/50">{copyright}</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const FILL = { flex: 1 } as const;
