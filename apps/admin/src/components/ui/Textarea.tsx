import { cn } from '@/lib/cn';

/**
 * Multi-line field of the panel. Same skin as `Input` -- `rounded-2xl` over
 * cream, subtle border, visible focus ring (rule 60) -- so a form does not look
 * like two different design systems stacked.
 *
 * As in `Input`, the error state is not a prop but `aria-invalid`: Tailwind 4
 * compiles the `aria-invalid:` variant to `[aria-invalid="true"]`, so the border
 * and what assistive technology announces are driven by the same attribute and
 * cannot drift apart.
 *
 * `resize-y`: growing the box vertically is useful for a long description, while
 * horizontal resizing would break the column of the form.
 */
export type TextareaProps = React.ComponentProps<'textarea'>;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'block w-full resize-y rounded-2xl border border-black/10 bg-cream px-4 py-3',
        'text-sm text-gray-900 placeholder:text-gray-500',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-green',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-red-600 aria-invalid:focus-visible:outline-red-600',
        className,
      )}
      {...props}
    />
  );
}
