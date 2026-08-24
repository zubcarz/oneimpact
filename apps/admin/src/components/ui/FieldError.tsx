import { cn } from '@/lib/cn';

/**
 * Inline validation message, in Spanish, for the field whose `aria-describedby`
 * points at this `id`.
 *
 * `role="alert"` (implicit `aria-live="assertive"`) so the message is announced
 * when it appears after a failed submit. It renders `null` when there is no
 * message: an empty live region left in the DOM is the usual reason a screen
 * reader announces nothing the second time the same error shows up.
 */
export interface FieldErrorProps extends React.ComponentProps<'p'> {
  id: string;
  children?: React.ReactNode;
}

export function FieldError({ className, children, ...props }: FieldErrorProps) {
  if (children === undefined || children === null || children === false || children === '') {
    return null;
  }

  return (
    <p role="alert" className={cn('text-sm font-medium text-red-700', className)} {...props}>
      {children}
    </p>
  );
}
