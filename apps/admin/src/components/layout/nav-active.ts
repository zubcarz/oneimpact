/**
 * Which sidebar item is the current one.
 *
 * It lives apart from `Sidebar.tsx` because it is the only branching logic of
 * the shell and `apps/admin` has no jsdom (decision D5 of the plan): a `.ts`
 * module is what Vitest can cover, while the markup is covered by Playwright.
 *
 * The naive version (`pathname.startsWith(href)`) is wrong twice over: it lights
 * up every item when `href` is `/`, and it lights up `/projects` while standing
 * on a hypothetical `/projects-x`, because "projects-x" also starts with
 * "projects". Both cases are in the test.
 */

/**
 * `true` when `pathname` is `href` itself or one of its sub routes.
 *
 * The sub route match is what keeps "Proyectos" highlighted on `/projects/new`
 * and `/projects/<id>/updates`, the routes that arrive in phases 4 and 5. The
 * separator is required (`${href}/`), so a sibling route that merely shares the
 * prefix does not match.
 *
 * `href === '/'` only matches the root: any other rule would make a "home" item
 * active on every screen of the panel.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === '/') return current === '/';
  if (current === target) return true;
  return current.startsWith(`${target}/`);
}

/**
 * Drops trailing slashes so `/projects` and `/projects/` are the same item.
 *
 * `usePathname` does not add one today (`trailingSlash` is not enabled in
 * `next.config.ts`), but a hand written `href` can, and that difference should
 * not decide whether the item is highlighted.
 */
function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : '/';
}
