import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { X } from 'lucide-react-native';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { overlay } from '@/theme/overlays';
import { contactEmail, copyright, footerMenu, footerTagline, type NavItem } from '@/data/nav';

const LOGO_SOURCE = require('@/assets/images/logo-white.png');
const LOGO_SIZE = { width: 82, height: 32 };

function goTo(item: NavItem) {
  router.push(item.href as Href);
}

/** Footer de todas las pantallas publicas (`componentes.md`). */
export function Footer() {
  return (
    <View className="bg-slate px-4 pb-8 pt-14">
      <Image source={LOGO_SOURCE} contentFit="contain" style={LOGO_SIZE} />
      <Text className="mt-4 max-w-xs text-xs text-white/50">{footerTagline}</Text>

      <View className="mt-4 flex-row gap-4">
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Instagram"
          className="min-h-[44px] min-w-[44px] items-center justify-center active:opacity-70"
        >
          <InstagramIcon size={20} color={overlay.white60} />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="X"
          className="min-h-[44px] min-w-[44px] items-center justify-center active:opacity-70"
        >
          <X size={20} color={overlay.white60} />
        </Pressable>
      </View>

      <View className="mt-10 flex-row gap-16">
        <View>
          <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
            Menu
          </Text>
          {footerMenu.map((item) => (
            <Pressable
              key={item.href}
              accessibilityRole="link"
              accessibilityLabel={item.label}
              onPress={() => goTo(item)}
              className="py-1.5 active:opacity-70"
            >
              <Text className="text-sm text-white/70">{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View>
          <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
            Contacto
          </Text>
          <Text className="text-sm text-white/70">{contactEmail}</Text>
        </View>
      </View>

      <View className="mt-10 border-t border-white/10 pt-6">
        <Text className="text-xs text-white/30">{copyright}</Text>
      </View>
    </View>
  );
}
