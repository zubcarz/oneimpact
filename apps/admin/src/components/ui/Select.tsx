import { cn } from '@/lib/cn';

/**
 * Native `<select>`, styled with the tokens of the panel.
 *
 * It is not a custom combobox: decision D3(b) of the plan keeps this scope free
 * of overlays, and the native control already brings keyboard handling, mobile
 * pickers and screen reader support that a `div` based menu would have to
 * reimplement.
 *
 * The API is `options`, not `children`: every select of this item comes from a
 * list (zones, statuses), and a single way of feeding it keeps the option markup
 * -- and its `value=""` placeholder -- from drifting per call site.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.ComponentProps<'select'>, 'children'> {
  /** Required: it is what a `<Label htmlFor>` points at. */
  id: string;
  options: readonly SelectOption[];
}

export function Select({ id, options, className, ...props }: SelectProps) {
  return (
    <select
      id={id}
      className={cn(
        'block w-full min-h-11 rounded-2xl border border-black/10 bg-cream px-4 py-3',
        'text-sm text-gray-900',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-green',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-red-600 aria-invalid:focus-visible:outline-red-600',
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
