import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { readSession } from '@/lib/session';

/**
 * Shell of the panel: forest sidebar, top bar with the account and a cream
 * content area (rule 60).
 *
 * Server Component. It reads the session once and hands the email down to
 * `Topbar`, so the only Client Component of the shell is `Sidebar`, which needs
 * `usePathname` to know which item is active.
 *
 * Screens under `(dashboard)` compose their own heading with `PageHeader`; the
 * shell does not render one, because the title belongs to the page.
 */

/**
 * Reaching this layout without a session should be impossible: `src/proxy.ts`
 * redirects to `/login` when the cookie is missing, unreadable or expired. If it
 * happens anyway (a cookie dropped between the proxy and the render), the answer
 * is the same redirect, not a shell with an empty account: rendering a panel
 * that looks signed in around requests that will all come back 401 is worse than
 * one extra trip to the login screen.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (session === null) redirect('/login');

  return (
    // Column on a narrow screen (nav on top), row from `md` up. `min-w-0` on the
    // content column is what stops a wide table from pushing the whole shell
    // sideways: without it a flex child refuses to shrink below its content and
    // the page scrolls horizontally.
    <div className="flex min-h-screen flex-col bg-cream md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={session.email} />
        <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
