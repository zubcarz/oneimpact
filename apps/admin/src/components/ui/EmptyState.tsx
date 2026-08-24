import { cn } from '@/lib/cn';

/**
 * Empty state of a list: what the panel shows instead of a table with no rows.
 *
 * The copy arrives as props (in Spanish, written by the screen) because the
 * useful sentence depends on whether the list is empty because nothing exists
 * yet or because a filter left it empty -- a generic "No hay datos" hides that
 * difference and leaves the admin without a next step.
 */
export interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title' | 'children'> {
  title: string;
  description?: string;
  /** Optional call to action, usually a `Button` or a link styled as one. */
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15',
        'bg-white px-6 py-14 text-center',
        className,
      )}
      {...props}
    >
      <p className="text-base font-bold text-gray-900">{title}</p>
      {description ? <p className="max-w-prose text-sm text-gray-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
