const { tailwindColors } = require('@oneimpact/ui-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light-only, but nativewind's default darkMode 'media' makes its
  // web runtime throw on boot: react-native-css-interop/dist/runtime/web/color-scheme.js
  // calls colorScheme.set() from a MutationObserver once the style tag lands,
  // and set() rejects any manual change while the flag is 'media'. 'class' keeps
  // that path legal. No 'dark:' utility is used anywhere.
  darkMode: 'class',
  theme: {
    extend: {
      colors: tailwindColors,
      // Geist static weights loaded in app/_layout.tsx (see src/theme/typography.ts).
      fontFamily: {
        sans: ['Geist_400Regular'],
        medium: ['Geist_500Medium'],
        semibold: ['Geist_600SemiBold'],
        bold: ['Geist_700Bold'],
        black: ['Geist_900Black'],
      },
    },
  },
  plugins: [],
};
