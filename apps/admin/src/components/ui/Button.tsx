import { cn } from '@/lib/cn';

/**
 * Pill button of the panel (rule 60: "todo boton es pildora").
 *
 * Written by hand instead of `shadcn/ui` (decision D3(b) of the plan): no
 * `class-variance-authority`, no Radix, no `clsx`. It renders a plain
 * `<button>`, so it works inside a `<form method="post">` without JavaScript.
 */

export type ButtonVariant = 'accent' | 'white' | 'dark' | 'ink';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant;
  /** `lg` is the big CTA of rule 60 (`text-base font-semibold py-4`). */
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * Layout and behaviour shared by every variant. Typography lives in `SIZES`, not
 * here: `cn` concatenates, it does not resolve Tailwind conflicts, and having
 * `text-sm` in the base plus `text-base` in a size would leave the winner to the
 * order of the generated stylesheet instead of to the prop.
 *
 * `disabled:pointer-events-none` is what keeps the hover colour from firing on a
 * disabled button; the state stays visible through the opacity.
 */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2';

/** `min-h-11` is the 44px touch target required by the accessibility rule. */
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-6 py-2.5 text-sm font-bold',
  lg: 'min-h-14 px-8 py-4 text-base font-semibold',
};

/**
 * The focus ring is per variant on purpose: `dark-green` disappears on a dark
 * background and `accent` disappears on cream.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-gray-900 hover:bg-accent-dark focus-visible:outline-dark-green',
  white: 'border border-black/10 bg-white text-gray-900 hover:bg-gray-100 focus-visible:outline-dark-green',
  dark: 'bg-gray-900 text-white hover:bg-gray-800 focus-visible:outline-accent',
  ink: 'border border-white/20 bg-ink text-white hover:bg-gray-800 focus-visible:outline-accent',
};

export function Button({
  variant = 'accent',
  size = 'md',
  fullWidth = false,
  className,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      // A `<button>` with no `type` inside a form defaults to `submit` and sends
      // it on the first click. Submitting has to be asked for explicitly.
      type={type ?? 'button'}
      className={cn(BASE, SIZES[size], VARIANTS[variant], fullWidth && 'w-full', className)}
      {...props}
    />
  );
}
