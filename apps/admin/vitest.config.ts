import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Same `@/*` -> `./src/*` mapping as `tsconfig.json`. Vitest does not read the
  // paths of tsconfig, so without this the unit tests are the only place in the
  // app that cannot import by alias, and the modules under test end up with
  // relative imports just to stay testable.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    passWithNoTests: true,
  },
});
