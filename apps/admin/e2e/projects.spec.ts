import { API_PATHS, ProjectStatus, projectWithUpdatesSchema } from '@oneimpact/shared';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { API_URL, PROJECTS_TABLE_NAME } from './constants';

/**
 * End to end flow of the projects section: create a project, publish an update
 * on it and check the new progress reaches the database.
 *
 * Runs in the `chromium-admin` project (`playwright.config.ts`), which is the
 * default for any spec that is not listed as anonymous: everything here needs an
 * admin session.
 *
 * ONE TEST AND NOT FOUR, on purpose. The steps are not independent cases that
 * happen to share a fixture -- each one only exists because the previous one
 * created something: there is no update to publish without a project, and no
 * progress to read from the API without an update. Splitting them would force a
 * `test.describe.serial` whose only job is to hide state passed through module
 * level variables, and a failure in the middle would report three failures for
 * one cause. `test.step` gives the same readable trace with none of that.
 *
 * Selectors are by role and by label, never by class (rule 40): the accessible
 * name of a control is part of the contract of the screen, a CSS class is not.
 */

/**
 * Zone the created project is filed under. It is a **slug**, which is what the
 * options of the zone select carry as their value, and it is one of the five of
 * the seed (`apps/api/prisma/seed.ts`).
 */
const SEED_ZONE_SLUG = 'amazonia';

/** Exact copy of `PublishUpdateForm`. Asserting it is the evidence of D4. */
const SIMULATED_STORAGE_NOTICE = 'Almacenamiento simulado: el avance se publica sin imagen';
const PUBLISHED_NOTICE = 'Avance publicado.';

/** Progress the update publishes, and therefore the progress the project ends at. */
const PUBLISHED_PROGRESS = 40;

/** Empty state of the updates screen, before anything is published. */
const NO_UPDATES_TEXT = 'Este proyecto todavía no tiene avances';

/**
 * The smallest valid PNG (1x1, transparent), inline as base64.
 *
 * `setInputFiles` takes the bytes from memory, so no fixture file is added to
 * the repo for something that is never looked at: what is under test is that the
 * panel notices storage is simulated, not what the image contains.
 */
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('an admin creates a project, publishes an update and the progress reaches the API', async ({
  page,
  request,
}, testInfo) => {
  const projectTitle = uniqueTitle('Proyecto', testInfo);
  const updateTitle = uniqueTitle('Avance', testInfo);

  await test.step('creates the project from the panel', async () => {
    await page.goto('/projects');
    await page.getByRole('link', { name: 'Nuevo proyecto' }).click();

    await expect(page.getByRole('heading', { name: 'Nuevo proyecto' })).toBeVisible();
    await fillProjectForm(page, projectTitle);

    // `selectOption` waits for the option to exist, so it covers the moment
    // before `useZones` has answered without an explicit wait.
    await page.getByLabel('Zona').selectOption(SEED_ZONE_SLUG);
    await page.getByLabel('Estado').selectOption(ProjectStatus.ACTIVE);

    await page.getByRole('button', { name: 'Crear proyecto' }).click();
  });

  const table = page.getByRole('table', { name: PROJECTS_TABLE_NAME });
  // Filtering the rows by the cell that holds the unique title is what makes
  // this row addressable no matter how many projects previous runs left behind:
  // there is no row index anywhere in this spec.
  const row = table
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: projectTitle, exact: true }) });

  await test.step('the project shows up in the table, at zero', async () => {
    await expect(page).toHaveURL('/projects');
    await expect(row.getByRole('cell', { name: 'Activo', exact: true })).toBeVisible();

    // `aria-valuenow` and not the visible text: it is the value a screen reader
    // announces, and the one the bar is actually drawn from.
    await expect(
      row.getByRole('progressbar', { name: `Progreso de ${projectTitle}` }),
    ).toHaveAttribute('aria-valuenow', '0');
  });

  /**
   * Id of the project, taken from the `href` of its own row.
   *
   * The panel goes back to `/projects` after creating -- not to the new project
   * -- so the URL of the moment does not carry it. Reading the link the table
   * just rendered keeps this deterministic: no `GET /v1/projects` scanned for a
   * title, and no assumption about ordering.
   */
  const updatesLink = row.getByRole('link', { name: `Avances de ${projectTitle}` });
  const projectId = projectIdFromUpdatesHref(await updatesLink.getAttribute('href'));

  await test.step('opens the updates screen of that project', async () => {
    await updatesLink.click();

    await expect(page).toHaveURL(`/projects/${projectId}/updates`);
    await expect(page.getByRole('heading', { name: 'Avances del proyecto' })).toBeVisible();
    // A project created seconds ago has none. Asserting it here is what makes
    // the assertion after publishing mean "this update appeared".
    await expect(page.getByText(NO_UPDATES_TEXT)).toBeVisible();
  });

  await test.step(`publishes an update at ${PUBLISHED_PROGRESS} %, with an image`, async () => {
    await page.getByLabel('Título del avance').fill(updateTitle);
    await page
      .getByLabel('Texto del avance')
      .fill('Se replantaron las primeras hectáreas y el proyecto avanza según lo previsto.');
    // A range input: `fill` sets the value and fires the events react-hook-form
    // listens to, without dragging a thumb by pixels.
    await page.getByLabel('Progreso del proyecto (%)').fill(String(PUBLISHED_PROGRESS));

    // The file wins because the URL box is left empty (precedence stated in
    // `PublishUpdateForm`), so this exercises the upload path.
    await page.getByLabel('Imagen (archivo)').setInputFiles({
      name: 'avance.png',
      mimeType: 'image/png',
      buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'),
    });

    await page.getByRole('button', { name: 'Publicar avance' }).click();
  });

  await test.step('the panel reports the update and the simulated storage', async () => {
    const notices = page.getByRole('status');

    // Evidence of decision D4: with no Supabase credentials -- the situation in
    // local and in CI -- the update is published and the image is not stored,
    // and the panel says so instead of persisting a dead link.
    await expect(notices.filter({ hasText: SIMULATED_STORAGE_NOTICE })).toBeVisible();
    await expect(notices.filter({ hasText: PUBLISHED_NOTICE })).toBeVisible();

    await expect(
      page.getByRole('progressbar', { name: `Progreso del avance ${updateTitle}` }),
    ).toHaveAttribute('aria-valuenow', String(PUBLISHED_PROGRESS));
    await expect(page.getByText(NO_UPDATES_TEXT)).toBeHidden();
  });

  await test.step('the table shows the progress of the update', async () => {
    await page.goto('/projects');

    await expect(
      row.getByRole('progressbar', { name: `Progreso de ${projectTitle}` }),
    ).toHaveAttribute('aria-valuenow', String(PUBLISHED_PROGRESS));
    // The number as a human reads it, next to the bar: `40 %`, with the space.
    await expect(row.getByText(`${PUBLISHED_PROGRESS} %`, { exact: true })).toBeVisible();
  });

  await test.step('the API stores the new progress', async () => {
    // The closing assertion goes against the source and not against the screen
    // that just wrote it: a panel showing 40 while the database holds 0 is
    // exactly the bug this flow exists to catch. `GET /v1/projects/:id` is
    // `@Public()`, so no token is attached.
    const response = await request.get(`${API_URL}${API_PATHS.projects.byId(projectId)}`);
    expect(response.ok()).toBe(true);

    // Parsed with the contract schema instead of casting the body: a response
    // that drifted from `packages/shared` fails here, and the values below are
    // typed without a single `as`.
    const project = projectWithUpdatesSchema.parse(await response.json());

    expect(project.title).toBe(projectTitle);
    expect(project.progress).toBe(PUBLISHED_PROGRESS);

    const published = project.updates.find((update) => update.title === updateTitle);
    expect(published).toBeDefined();
    expect(published?.progress).toBe(PUBLISHED_PROGRESS);
    // No image was stored, so nothing unresolvable was persisted either.
    expect(published?.mediaKey).toBeUndefined();
  });
});

/**
 * A title no other run can collide with, and that reads as test data at a
 * glance.
 *
 * There is no `DELETE /v1/projects/:id` in the contract
 * (apps/api/src/modules/projects/controllers/admin-projects.controller.ts), so a
 * spec that creates a project cannot clean up after itself: every run leaves a
 * row behind and the suite has to stay green on a database that already holds
 * the rows of the previous ten. Uniqueness is what replaces the cleanup.
 *
 * `Date.now()` separates runs, `workerIndex` and `repeatEachIndex` separate the
 * parallel and repeated executions inside one run, which the clock alone does
 * not. Base 36 keeps it short: `createProjectSchema.title` allows 120
 * characters and this stays well under 60.
 */
function uniqueTitle(kind: string, testInfo: TestInfo): string {
  const stamp = `${Date.now().toString(36)}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
  return `[e2e] ${kind} de prueba ${stamp}`;
}

/**
 * `/projects/<id>/updates` -> `<id>`.
 *
 * Throws instead of returning `null` because there is no sensible way to
 * continue: every assertion after this point is about that id, and a spec that
 * silently carried on with an empty string would fail later with a message about
 * a 404 rather than about the link that changed shape.
 */
function projectIdFromUpdatesHref(href: string | null): string {
  const match = /^\/projects\/([^/]+)\/updates$/.exec(href ?? '');

  if (match === null) {
    throw new Error(
      `The "Avances" link of the row does not look like /projects/<id>/updates: ${String(href)}`,
    );
  }

  return match[1];
}

/**
 * Fills everything in the project form except the two selects, which need
 * `selectOption` and are left to the caller.
 *
 * `Fecha objetivo` is written in the `YYYY-MM-DDTHH:mm` a `datetime-local`
 * takes; the panel reads it as UTC on purpose
 * (`src/features/projects/form-utils.ts`), which is why a date typed here comes
 * back as the same day in the table regardless of the time zone of the machine
 * running the suite.
 */
async function fillProjectForm(page: Page, title: string): Promise<void> {
  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Resumen').fill('Proyecto creado por la suite e2e del panel.');
  await page
    .getByLabel('Descripción')
    .fill(
      'Proyecto de prueba creado por Playwright para verificar el alta y la publicación de avances.',
    );
  // Starts at zero so the assertion after publishing proves the update moved it.
  await page.getByLabel('Progreso (%)').fill('0');
  await page.getByLabel('Fecha objetivo').fill('2027-06-30T00:00');
  await page.getByLabel('Latitud').fill('-3.4653');
  await page.getByLabel('Longitud').fill('-62.2159');
}
