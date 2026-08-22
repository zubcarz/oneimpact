import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_900Black,
} from '@expo-google-fonts/geist';

/**
 * Font family names, matching the weights registered by `fontAssets` below and
 * the `fontFamily` map in `tailwind.config.js`.
 */
export const fontFamilies = {
  sans: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  black: 'Geist_900Black',
} as const;

/**
 * Font asset map consumed by `useFonts` in `app/_layout.tsx`.
 */
export const fontAssets = {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_900Black,
};
