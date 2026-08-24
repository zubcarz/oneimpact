import { cn } from '@/lib/cn';

/**
 * Field label. `htmlFor` is required by the type, not optional: a label that is
 * not tied to its control reads as loose text for a screen reader and does not
 * move focus when clicked.
 */
export interface LabelProps extends React.ComponentProps<'label'> {
  htmlFor: string;
}

export function Label({ className, ...props }: LabelProps) {
  return <label className={cn('block text-sm font-bold text-gray-900', className)} {...props} />;
}
