import { redirect } from 'next/navigation';

/**
 * The root is not a screen of the panel, it is an entry point.
 *
 * Reaching this component already means there is a valid `ADMIN` session:
 * `src/proxy.ts` guards `/` like any other route and sends anyone else to
 * `/login` or to `/403`. So the only sensible destination left is the working
 * screen of the panel.
 */
export default function Home() {
  redirect('/projects');
}
