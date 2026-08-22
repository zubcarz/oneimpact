import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { colors } from '@oneimpact/ui-tokens';
import { navAccessibilityLabels } from '@/data/nav';

export type HeaderLogo = 'white' | 'black';

export interface HeaderProps {
  /** Variante del logo/icono; `white` para flotar sobre fondos oscuros. */
  logo?: HeaderLogo;
  onMenuPress?: () => void;
  testID?: string;
}

const LOGO_SOURCES: Record<HeaderLogo, number> = {
  white: require('@/assets/images/logo-white.png'),
  black: require('@/assets/images/logo-black.png'),
};

/** 82x32 preserva el ratio 768x299 del logo rasterizado a 32px de alto. */
const LOGO_SIZE = { width: 82, height: 32 };

/** Header transparente y absoluto de todas las pantallas (`componentes.md`). */
export function Header({ logo = 'white', onMenuPress, testID }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const iconColor = logo === 'white' ? colors.white : colors.gray900;

  return (
    <View
      className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-4 py-4"
      style={{ paddingTop: insets.top }}
      testID={testID}
    >
      <Image source={LOGO_SOURCES[logo]} contentFit="contain" style={LOGO_SIZE} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={navAccessibilityLabels.openMenu}
        onPress={onMenuPress}
        className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 active:opacity-80"
      >
        <Menu size={24} color={iconColor} />
      </Pressable>
    </View>
  );
}
