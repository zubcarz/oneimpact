/**
 * How the panel decides whether the `mediaKey` of an update can be rendered as
 * an image.
 *
 * The API stores `publishUpdateSchema.mediaUrl` **verbatim** in
 * `ProjectUpdate.mediaKey`
 * (apps/api/src/modules/projects/application/projects-writes.service.ts:113-121,
 * decision D5a of the payments plan), and the seed fills that column with
 * relative storage keys (`updates/reforestacion-1.jpg`). So the same field holds
 * two different kinds of value depending on who wrote the row, and only one of
 * them is something a browser can load.
 *
 * Pointing an `<img>` at a relative key would render a broken image and, worse,
 * would ask the panel's own origin for a path that does not exist. Showing the
 * key as text says the truth: there is a stored reference the panel cannot
 * resolve on its own.
 */

/**
 * `true` only for an `http`/`https` URL.
 *
 * The scheme check is not decoration. Measured in phase 0 of this plan:
 * `z.url()` of zod 4.4.3 accepts **any** scheme, so `local-simulated://...`
 * passes the contract and can reach this column -- and no browser can fetch it.
 * The same check keeps `javascript:` and `data:` out of the `src`.
 */
export function isRenderableMediaUrl(value: string | undefined): boolean {
  if (value === undefined) return false;

  const trimmed = value.trim();
  if (trimmed === '') return false;

  let parsed: URL;
  try {
    // `new URL` throws for a relative key, which is precisely the case that has
    // to be told apart, so the rejection is the answer and not an error.
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}
