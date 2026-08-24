/**
 * Presentation-only formatting for the card fields of the Pago simulado
 * screen (`pantallas-nuevas.md:29-33`, "máscara 4-4-4-4" / "MM/AA"). Luhn
 * validation and brand detection are **not** re-implemented here: they live
 * once, in `@oneimpact/shared` (`isValidLuhn`, `detectCardBrand`).
 */

/** Digits of a Visa/Mastercard PAN. Amex (15) is out of scope for this screen. */
export const PAN_LENGTH = 16;

/** Groups the digits typed so far in 4-4-4-4, capped at `PAN_LENGTH`. */
export function formatPan(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '').slice(0, PAN_LENGTH);
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

/**
 * A PAN is only usable once it is BOTH complete and Luhn-valid.
 *
 * `isValidLuhn` alone is not enough and that is not a detail: it validates the
 * check digit, not the length, so it answers `true` for the 15 digits of
 * "4242 4242 4242 424". Gating the CTA on Luhn only let an incomplete card
 * through, and since the server never sees the PAN it could not catch it
 * either -- the payment would be persisted with `last4: "2424"` instead of
 * "4242", a wrong record with no way back.
 */
export function isCompletePan(value: string): boolean {
  return value.replace(/\D/g, '').length === PAN_LENGTH;
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
 * Lower bound of `simulatedCardSchema.expYear`
 * (`packages/shared/src/schemas/payment.ts`). Mirrored here because this
 * module cannot read a zod constraint back out of the schema, and because
 * what it guards is subtle -- see `parseExpiry`.
 */
const MIN_EXP_YEAR = 2024;

/**
 * Parses a complete "MM/AA" into `{ expMonth, expYear }` with a 4-digit year
 * (`2000 + AA`). Returns `null` for anything that isn't a full, in-range
 * "MM/AA" pair -- the caller treats that as an invalid field, never as a
 * partially-built payload.
 *
 * "In range" means `expYear >= MIN_EXP_YEAR`, and that bound is deliberately
 * NOT "not expired yet". The two failures are different and only one of them
 * belongs to the client:
 *
 * - A year below the bound (typing "12/01" -> 2001) fails `simulatedCardSchema`
 *   itself, so the API answers **400** from the zod pipe. That response carries
 *   no domain `code`, so the screen can only show a generic error and the user
 *   never learns which field is wrong. Catching it here is the only way to point
 *   at the field.
 * - A year at or above the bound that has already passed (say "01/25" today) is
 *   a valid payload that the simulator declines on purpose with **402
 *   CARD_EXPIRED** (`.claude/rules/30-api-event-driven.md`, "expiracion pasada
 *   -> FAILED"). That path is a feature of the demo, so it must reach the
 *   server: blocking it here would delete one of the two decline cases the
 *   product is meant to show.
 */
export function parseExpiry(value: string): ParsedExpiry | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return null;

  const expMonth = Number(match[1]);
  if (expMonth < 1 || expMonth > 12) return null;

  const expYear = 2000 + Number(match[2]);
  if (expYear < MIN_EXP_YEAR) return null;

  return { expMonth, expYear };
}
