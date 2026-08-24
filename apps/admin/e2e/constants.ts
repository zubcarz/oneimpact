/**
 * Shared constants of the Playwright suite: the accounts it signs in with, the
 * accessible names it selects by and the seed data it asserts against.
 *
 * They live apart from the specs because `playwright.config.ts` and
 * `global-setup.ts` need some of them too, and a base URL or a storage state
 * path written twice is a base URL or a storage state path that will drift.
 */

export interface E2eAccount {
  readonly email: string;
  readonly password: string;
}

/**
 * Accounts of the API seed (`apps/api/prisma/seed.ts`).
 *
 * They are **not secrets**: they are development credentials, already published
 * in `docs/local-development.md`. They are still read from the environment so a
 * run against another database (a preview environment, for instance) only needs
 * variables, not a patch to this file.
 */
export const ADMIN_ACCOUNT: E2eAccount = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@oneimpact.org',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!',
};

/** Seeded account with role `USER`: the one that must land on `/403`. */
export const USER_ACCOUNT: E2eAccount = {
  email: process.env.E2E_USER_EMAIL ?? 'ana@oneimpact.org',
  password: process.env.E2E_USER_PASSWORD ?? 'User123!',
};

/** Origin of the panel. Mirrors `next dev -p 5001` / `next start -p 5001`. */
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5001';

/**
 * Where `global-setup.ts` leaves the admin session for the `chromium-admin`
 * project.
 *
 * Relative on purpose: both the writer (`storageState({ path })`, plain `fs`)
 * and the reader (`use.storageState`) resolve it from `process.cwd()`, and the
 * only supported way to run the suite is `pnpm --filter @oneimpact/admin
 * test:e2e`, which sets the cwd to `apps/admin`. It is gitignored
 * (`apps/admin/.gitignore`): it holds a real session cookie.
 */
export const ADMIN_STORAGE_STATE = 'e2e/.auth/admin.json';

/**
 * Accessible name of the projects table, rendered as a visually hidden
 * `<caption>` (`src/components/ui/Table.tsx`). Landing on it is what "the login
 * worked" means for this suite.
 */
export const PROJECTS_TABLE_NAME = 'Proyectos de One Impact';

/**
 * Titles of the five projects created by `apps/api/prisma/seed.ts`.
 *
 * Asserting each one is visible is stronger and less brittle than asserting an
 * exact row count: it does not depend on the order the API returns, and it
 * survives rows added by another spec running in parallel (`projects.spec.ts`
 * of phase 6 writes to this same database). If the seed changes, this list is
 * the single place to update.
 */
export const SEEDED_PROJECT_TITLES = [
  'Restauración de ecosistemas en Guainía',
  'Inicio de diagnóstico ecológico costero en Yucatán',
  'Diseño de corredores verdes en savana oriental',
  'Sistema de monitoreo satelital en Borneo',
  'Certificación de créditos de carbono en Amazonía',
] as const;
