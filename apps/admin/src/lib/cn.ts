/**
 * Minimal class name joiner for the UI primitives.
 *
 * It is not `clsx` and it is not `tailwind-merge`: decision D3(b) of the plan
 * keeps `apps/admin` at zero new dependencies. The only job here is dropping the
 * falsy values that a conditional class or an optional `className` prop leaves
 * behind, so the rendered attribute never carries `undefined` or a double space.
 *
 * It does **not** resolve Tailwind conflicts. Consumers pass `className` last
 * and the CSS cascade of Tailwind 4 decides; a primitive that needs a real
 * override exposes a variant instead of relying on class order.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .join(' ');
}
