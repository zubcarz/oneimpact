'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { isNavItemActive } from './nav-active';

/**
 * Navigation of the panel: forest background and pill items (rule 60).
 *
 * **Why this one is a Client Component** (the only one of the shell): the active
 * item depends on the current URL and `usePathname` is client-only by design --
 * "Reading the current URL from a Server Component is not supported"
 * (next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md). The
 * alternative, passing the pathname down from the layout, is not available
 * either: a layout does not receive it. The component holds no state and no data
 * fetching, so what ships to the browser is the list plus one comparison.
 */

interface NavItem {
  href: string;
  label: string;
}

/**
 * The five sections of the panel. `zones`, `users` and `subscriptions` are still
 * the placeholders of item 13, kept here with the same destinations and labels
 * they had in the previous layout so no link of the panel dies in this rewrite.
 */
const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Métricas' },
  { href: '/projects', label: 'Proyectos' },
  { href: '/zones', label: 'Zonas' },
  { href: '/users', label: 'Usuarios' },
  { href: '/subscriptions', label: 'Suscripciones' },
];

/** `min-h-11` is the 44px touch target required by the accessibility rule. */
const ITEM_BASE =
  'flex min-h-11 items-center whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const ITEM_ACTIVE = 'bg-accent text-gray-900';
const ITEM_INACTIVE = 'text-white/80 hover:bg-white/10 hover:text-white';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-forest px-4 py-5 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:px-6 md:py-8">
      <div className="mb-5 md:mb-10">
        {/*
          `.svg` is served untouched by the image optimizer, which refuses SVG
          unless `dangerouslyAllowSVG` is on; `unoptimized` is the documented
          prop for a source known to be SVG (image.md:939) and it keeps this out
          of `next.config.ts`, which is outside the write scope.
        */}
        <Image src="/logo_blanco.svg" alt="One Impact" width={144} height={56} priority unoptimized />
      </div>

      <nav aria-label="Secciones del panel">
        {/*
          Row that scrolls sideways on a narrow screen, column from `md` up. This
          is what keeps the shell usable on a laptop in portrait without a
          hamburger menu: the items never wrap onto the content.
        */}
        <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  // Read by screen readers and asserted by Playwright: the
                  // active state cannot be a colour only.
                  aria-current={active ? 'page' : undefined}
                  className={cn(ITEM_BASE, active ? ITEM_ACTIVE : ITEM_INACTIVE)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
