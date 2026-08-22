/**
 * Minimal className concatenator for NativeWind. Filters out falsy values so
 * conditional variant classes can be composed without pulling in clsx.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
