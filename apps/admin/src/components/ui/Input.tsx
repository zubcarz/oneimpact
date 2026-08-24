import { cn } from '@/lib/cn';

/**
 * Text field of the panel: `rounded-2xl` over cream, subtle border (rule 60).
 *
 * The error state is not a prop, it is `aria-invalid`. Tailwind 4 turns the
 * `aria-invalid:` variant into `[aria-invalid="true"]`, so the assistive
 * technology and the border are driven by the same attribute and cannot drift
 * apart. The caller wires the message with
 * `aria-describedby={errorId}` pointing at a `<FieldError id={errorId}>`.
 */
export type InputProps = React.ComponentProps<'input'>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'block w-full min-h-11 rounded-2xl border border-black/10 bg-cream px-4 py-3',
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
