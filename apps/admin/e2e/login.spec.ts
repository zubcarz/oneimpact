import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_ACCOUNT,
  PROJECTS_TABLE_NAME,
  SEEDED_PROJECT_TITLES,
  USER_ACCOUNT,
  type E2eAccount,
} from './constants';

/**
 * Sign in flow of the panel, against the real API and the real seed.
 *
 * Runs in the `chromium-anon` project (`playwright.config.ts`): the four cases
 * start with no cookies, including the happy path, which signs in explicitly so
 * the flow itself is what is under test rather than the storage state produced
 * by the global setup.
 *
 * Selectors are by role and by label, never by class (rule 40): the visible copy
 * is part of the contract of the screen, a CSS class is not.
 */

/** The projects table renders one `<tr>` of column headers on top of the data. */
const HEADER_ROW_COUNT = 1;

test.describe('login', () => {
  test('an admin signs in and sees the seeded projects', async ({ page }) => {
    await page.goto('/login');
    await signIn(page, ADMIN_ACCOUNT);

    await expect(page).toHaveURL(/\/projects$/);

    const table = page.getByRole('table', { name: PROJECTS_TABLE_NAME });
    await expect(table).toBeVisible();

    for (const title of SEEDED_PROJECT_TITLES) {
      await expect(table.getByRole('cell', { name: title, exact: true })).toBeVisible();
    }

    // Lower bound, not equality: another spec may have added rows to the same
    // database. The five assertions above already carry the real claim, that
    // every seeded project is on screen.
    const rowCount = await table.getByRole('row').count();
    expect(rowCount).toBeGreaterThanOrEqual(SEEDED_PROJECT_TITLES.length + HEADER_ROW_COUNT);
  });

  test('a signed in USER gets the restricted screen instead of the panel', async ({ page }) => {
    await page.goto('/login');
    await signIn(page, USER_ACCOUNT);

    // The session is opened for a USER too -- the role check lives in the guard,
    // which **rewrites** to /403, so the URL stays on the requested route. That
    // is why the assertion is about the content and the URL check is only a
    // secondary confirmation of the rewrite.
    await expect(
      page.getByRole('heading', { name: 'Esta cuenta no puede entrar al panel' }),
    ).toBeVisible();
    await expect(page.getByText(USER_ACCOUNT.email)).toBeVisible();
    await expect(page.getByRole('table', { name: PROJECTS_TABLE_NAME })).toBeHidden();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test('a protected route without a session ends on the login screen', async ({ page }) => {
    await page.goto('/projects');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible();
    await expect(page.getByRole('table', { name: PROJECTS_TABLE_NAME })).toBeHidden();
  });

  test('wrong credentials show the error and keep the visitor on the login screen', async ({
    page,
  }) => {
    await page.goto('/login');
    // A real email with a wrong password: it reaches the API and comes back 401,
    // instead of being stopped by the client side schema.
    await signIn(page, { email: ADMIN_ACCOUNT.email, password: 'ContrasenaIncorrecta1' });

    // Next renders its own `role="alert"` route announcer, always empty on this
    // screen, at the end of the body. Requiring content is what tells the error
    // of the form apart from it without falling back to a CSS selector.
    const formError = page.getByRole('alert').filter({ hasText: /\S/ });
    await expect(formError).toHaveText('Correo o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login$/);
  });
});

/** Fills the credentials form and submits it. Does not wait for the outcome. */
async function signIn(page: Page, account: E2eAccount): Promise<void> {
  await page.getByLabel('Correo electrónico').fill(account.email);
  await page.getByLabel('Contraseña').fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}
