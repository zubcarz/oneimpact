import { cn } from '@/lib/cn';

/**
 * Table of the panel: real `<table>` semantics, never divs with `role`.
 *
 * Playwright selects by role in this repo (rule 40), and a native table is also
 * what gives a screen reader the row/column relationship for free. The parts are
 * exported one by one instead of taking a `columns` config: the projects table
 * has cells with a `ProgressBar` and cells with links, and a config driven table
 * ends up growing a render prop per column anyway.
 */

export interface TableProps extends React.ComponentProps<'table'> {
  /**
   * Accessible name of the table, in Spanish. Rendered as a visually hidden
   * `<caption>` so `getByRole('table', { name })` can find it without adding a
   * heading to the page design.
   */
  caption: string;
  /** Classes for the scrolling wrapper, not for the `<table>` itself. */
  containerClassName?: string;
}

export function Table({ caption, className, containerClassName, children, ...props }: TableProps) {
  return (
    // The wrapper is what scrolls: without `overflow-x-auto` here, a wide table
    // stretches the page and the sidebar layout breaks on a small screen.
    <div
      className={cn(
        'w-full overflow-x-auto rounded-2xl border border-black/10 bg-white',
        containerClassName,
      )}
    >
      <table className={cn('w-full min-w-[48rem] border-collapse text-left text-sm', className)} {...props}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export type TableHeadProps = React.ComponentProps<'thead'>;

export function TableHead({ className, ...props }: TableHeadProps) {
  return <thead className={cn('border-b border-black/10 bg-cream', className)} {...props} />;
}

export type TableBodyProps = React.ComponentProps<'tbody'>;

export function TableBody({ className, ...props }: TableBodyProps) {
  return <tbody className={cn('divide-y divide-black/5', className)} {...props} />;
}

export type TableRowProps = React.ComponentProps<'tr'>;

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn('transition-colors hover:bg-cream/60', className)} {...props} />;
}

export interface TableHeaderCellProps extends React.ComponentProps<'th'> {
  /** Column header by default; `row` when the cell names its own row. */
  scope?: 'col' | 'row';
}

export function TableHeaderCell({ scope = 'col', className, ...props }: TableHeaderCellProps) {
  return (
    <th
      scope={scope}
      className={cn(
        'px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700 whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

export type TableCellProps = React.ComponentProps<'td'>;

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn('px-4 py-4 align-middle text-gray-900', className)} {...props} />;
}
