/**
 * Heading of a screen of the panel: title, optional description and a slot for
 * the actions of the page (usually a `Button` or a link styled as one).
 *
 * Server Component: it renders whatever it is given and holds no state. The
 * actions slot accepts either the `actions` prop or `children`, so a page with a
 * single button can write it inline.
 *
 * Typography follows rule 60: section heading at 30px in weight 900
 * (`text-3xl font-black`).
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Actions aligned to the right. Falls back to `children`. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  const rightSlot = actions ?? children;

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-black text-gray-900">{title}</h1>
        {description ? <p className="mt-1 max-w-prose text-sm text-gray-600">{description}</p> : null}
      </div>
      {rightSlot ? <div className="flex flex-wrap items-center gap-2">{rightSlot}</div> : null}
    </div>
  );
}
