/**
 * Presentation-only formatting for the card fields of the Pago simulado
 * screen (`pantallas-nuevas.md:29-33`, "máscara 4-4-4-4" / "MM/AA"). Luhn
 * validation and brand detection are **not** re-implemented here: they live
 * once, in `@oneimpact/shared` (`isValidLuhn`, `detectCardBrand`).
 */

/** Groups the digits typed so far in 4-4-4-4, capped at 16 digits (Visa/Mastercard length). */
export function formatPan(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '').slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

/** Inserts the `/` after the month as the user types "MM/AA". */
export function formatExpiry(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export interface ParsedExpiry {
  expMonth: number;
  expYear: number;
}

/**
 * Parses a complete "MM/AA" into `{ expMonth, expYear }` with a 4-digit year
 * (`2000 + AA`), coherent with `simulatedCardSchema`'s `expYear >= 2024`
 * (`packages/shared/src/schemas/payment.ts`). Returns `null` for anything
 * that isn't a full, in-range "MM/AA" pair -- the caller treats that as an
 * invalid field, never as a partially-built payload.
 */
export function parseExpiry(value: string): ParsedExpiry | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;

  const expMonth = Number(match[1]);
  if (expMonth < 1 || expMonth > 12) return null;

  return { expMonth, expYear: 2000 + Number(match[2]) };
}
