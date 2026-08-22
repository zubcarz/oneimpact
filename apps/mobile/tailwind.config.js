const { tailwindColors } = require('@oneimpact/ui-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
