/**
 * Skeleton of the projects list, shown while the Server Component fetches.
 *
 * It mirrors the real layout -- heading, two filters, table with six columns --
 * so the page does not jump when the data lands. The bars carry no text: the
 * status is announced once, by the `role="status"` line, instead of by a dozen
 * empty boxes.
 */

const ROWS = [0, 1, 2, 3, 4];

export default function ProjectsLoading() {
  return (
    <section aria-busy="true">
      <p role="status" className="sr-only">
        Cargando proyectos...
      </p>

      <div aria-hidden="true">
        <div className="mb-6">
          <div className="h-9 w-48 animate-pulse rounded-full bg-black/10" />
          <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-full bg-black/5" />
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="h-11 w-full min-w-56 flex-1 animate-pulse rounded-2xl bg-black/10 sm:max-w-64" />
          <div className="h-11 w-full min-w-56 flex-1 animate-pulse rounded-2xl bg-black/10 sm:max-w-64" />
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="h-11 border-b border-black/10 bg-cream" />
          <div className="divide-y divide-black/5">
            {ROWS.map((row) => (
              <div key={row} className="flex items-center gap-4 px-4 py-4">
                <div className="h-4 flex-1 animate-pulse rounded-full bg-black/10" />
                <div className="h-4 w-32 animate-pulse rounded-full bg-black/5" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-black/5" />
                <div className="h-2 w-40 animate-pulse rounded-full bg-black/10" />
                <div className="h-4 w-24 animate-pulse rounded-full bg-black/5" />
                <div className="h-4 w-28 animate-pulse rounded-full bg-black/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
