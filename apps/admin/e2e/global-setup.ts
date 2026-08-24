import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { ADMIN_ACCOUNT, ADMIN_STORAGE_STATE, BASE_URL, PROJECTS_TABLE_NAME } from './constants';

/**
 * Signs in once, through the UI, and leaves the session in
 * `e2e/.auth/admin.json` for the `chromium-admin` project.
 *
 * Through the UI and not with a direct call to `/api/auth/login` on purpose: the
 * cookies are `httpOnly` and are written by that route handler, so driving the
 * real form is what produces exactly the state a browser would have. It also
 * turns this setup into a smoke test of the whole chain (admin -> API ->
 * Postgres) that fails once, here, with a readable message, instead of failing
 * in every spec with a "cookie not found".
 *
 * Playwright starts `webServer` **before** global setup
 * (`createGlobalSetupTasks` runs the plugin setup tasks first,
 * node_modules/playwright/lib/runner/index.js:6003-6010), so the panel is
 * already answering when this runs.
 */

/** Enough for a cold `next dev` compile of `/login` plus the round trip to the API. */
const SIGN_IN_TIMEOUT_MS = 60_000;

/** Short: by the time it is read the page has already settled into its failure. */
const DIAGNOSIS_TIMEOUT_MS = 2_000;

async function globalSetup(): Promise<void> {
  // A leftover file from a previous run would silently authenticate the suite
  // with an expired token. Either this run writes a fresh state, or there is no
  // state at all and the dependent project fails loudly.
  await rm(ADMIN_STORAGE_STATE, { force: true });
  await mkdir(dirname(ADMIN_STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ baseURL: BASE_URL });
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill(ADMIN_ACCOUNT.email);
    await page.getByLabel('Contraseña').fill(ADMIN_ACCOUNT.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    try {
      await page
        .getByRole('table', { name: PROJECTS_TABLE_NAME })
        .waitFor({ state: 'visible', timeout: SIGN_IN_TIMEOUT_MS });
    } catch (cause) {
      throw new Error(await signInFailureMessage(page), { cause });
    }

    await page.context().storageState({ path: ADMIN_STORAGE_STATE });
  } finally {
    await browser.close();
  }
}

/**
 * Turns "something timed out" into something actionable. The message of the
 * panel, when there is one, separates "the API is down" (a 502 answer) from
 * "these credentials do not exist in this database" (a 401).
 */
async function signInFailureMessage(page: Page): Promise<string> {
  const alert = await page
    .getByRole('alert')
    .first()
    .textContent({ timeout: DIAGNOSIS_TIMEOUT_MS })
    .catch(() => null);

  return [
    `Playwright global setup could not sign in as ${ADMIN_ACCOUNT.email} at ${BASE_URL}.`,
    alert === null
      ? 'The projects table never showed up and the form reported no error.'
      : `The panel answered: "${alert.trim()}"`,
    'Checklist: Postgres running (pnpm db:up), API answering on http://localhost:5000/health',
    '(pnpm dev:api), seed applied (pnpm --filter @oneimpact/api db:setup), and those credentials',
    'existing in that database (override them with E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD).',
  ].join('\n');
}

export default globalSetup;
