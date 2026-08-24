import { defineConfig, devices } from '@playwright/test';
import { ADMIN_STORAGE_STATE, BASE_URL } from './e2e/constants';

/**
 * Specs that must start **without** a session, and therefore run in the
 * anonymous project. Everything else runs authenticated.
 *
 * The list is an opt-out instead of an opt-in because the negative cases are the
 * exception: a new spec dropped into `e2e/` gets the admin session by default,
 * which is what it will almost always want (`projects.spec.ts` of phase 6, for
 * instance). Globs are matched against the full path, hence the `**` prefix.
 */
const ANONYMOUS_SPECS = ['**/login.spec.ts'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Not raised above 1: retries hide flakiness, they do not fix it.
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }]],
  // Signs in once through the UI and writes ADMIN_STORAGE_STATE. It also acts as
  // the readiness check of the whole stack: if the API is down, the suite fails
  // here with one clear message instead of failing spec by spec.
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-anon',
      testMatch: ANONYMOUS_SPECS,
      // Explicitly empty rather than just "no storageState": it documents that
      // starting with no cookies is the point of this project, not an omission.
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
    },
    {
      name: 'chromium-admin',
      testIgnore: ANONYMOUS_SPECS,
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STORAGE_STATE },
    },
  ],
  /**
   * Playwright starts the panel **in CI too**, unlike the previous config, which
   * disabled `webServer` when `process.env.CI` was set.
   *
   * Reason: readiness. Playwright already polls `url` until it answers and only
   * then runs global setup, so the CI job does not need a background process, a
   * `sleep` or a retry loop of its own for the admin. The job keeps only the
   * loop for the API, which Playwright knows nothing about.
   *
   * The command differs by environment because the artifacts differ: CI has
   * already run `next build`, so it serves the production output (closer to what
   * is deployed and much faster to boot); locally `pnpm dev` is what a developer
   * has open, and `reuseExistingServer` attaches to it instead of starting a
   * second one on the same port.
   *
   * SIN CONFIRMAR: `next start` sets `NODE_ENV=production`, which turns the
   * session cookies `secure` (`src/lib/session.ts:29`). Chromium accepts
   * `Secure` cookies over `http://localhost` because it treats localhost as a
   * trustworthy origin, so this is expected to work -- but it has not been seen
   * green in CI yet.
   */
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: true,
    // A cold `next dev` compile on Windows can take well over a minute.
    timeout: 180_000,
  },
});
