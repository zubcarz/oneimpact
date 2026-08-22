/** Design tokens extracted from the One Impact web (Tailwind v4). Single source for mobile + admin. */
export const colors = {
  accent: '#c8d400',
  accentDark: '#a8b200',
  accentLight: '#dbe64c',
  forest: '#0f1a0a',
  darkGreen: '#243b1a',
  ink: '#1E1E1E',
  slate: '#2d3a42',
  cream: '#f0ece4',
  creamWarm: '#FFF6EA',
  creamCard: '#FFF1DA',
  highlight: '#FFE97A',
  neutral100: '#f5f5f5',
  gray900: '#101828',
  gray800: '#1e2939',
  gray700: '#364153',
  gray600: '#4a5565',
  gray500: '#6a7282',
  gray400: '#99a1af',
  gray200: '#e5e7eb',
  white: '#ffffff',
  black: '#000000',
} as const;

export const radius = { lg: 8, xl: 12, '2xl': 16, '3xl': 24, full: 9999 } as const;

export const spacing = { page: 16, pageWide: 20, section: 64, sectionSm: 56 } as const;

/** Tailwind `theme.extend.colors` fragment shared by NativeWind (mobile) and Tailwind (admin). */
export const tailwindColors = {
  accent: { DEFAULT: colors.accent, dark: colors.accentDark, light: colors.accentLight },
  forest: colors.forest,
  'dark-green': colors.darkGreen,
  ink: colors.ink,
  slate: colors.slate,
  cream: { DEFAULT: colors.cream, warm: colors.creamWarm, card: colors.creamCard },
  highlight: colors.highlight,
};
