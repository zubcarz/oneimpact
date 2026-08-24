import { browserApi } from '@/lib/api-browser';

/**
 * Image upload of a project update (decision D4 of the plan).
 *
 * Three facts, all measured in phase 0 of this plan, shape everything below:
 *
 * 1. `POST /v1/uploads/sign` answers `simulated: true` and a deliberately
 *    unresolvable `uploadUrl` (`local-simulated://uploads/<uuid>-foto.jpg`)
 *    whenever the API has no Supabase credentials -- which is **always** in
 *    local and in CI (apps/api/src/infra/storage/storage.service.ts:72-81).
 * 2. `signedUploadSchema` does not return the public URL of the object
 *    (packages/shared/src/schemas/payment.ts:115-120), so the panel has to
 *    compose it from a base URL it knows on its own.
 * 3. The API stores `publishUpdateSchema.mediaUrl` **verbatim** in
 *    `ProjectUpdate.mediaKey`
 *    (apps/api/src/modules/projects/application/projects-writes.service.ts:113-121).
 *
 * WHY THE SIMULATED BRANCH SENDS NOTHING, which is not the reason one expects:
 * it is tempting to assume `local-simulated://...` would be rejected by
 * `publishUpdateSchema.mediaUrl`, since it is `z.url()`. It is **not**. Measured
 * with `safeParse` on zod 4.4.3: `z.url()` accepts any scheme, so
 * `local-simulated://uploads/x.jpg` is VALID (while the bare key
 * `uploads/x.jpg` is not, having no scheme). The reason to omit the field is
 * fact 3: sending that string would persist a URL nothing can resolve into
 * `mediaKey`, forever, and a stored dead link is worse than an update with no
 * image. Whoever reads this next: do not "fix" it by sending the simulated URL
 * because zod happens to accept it.
 */

/** What the form needs to know after trying to attach an image. */
export interface SignAndUploadResult {
  /** Absolute, resolvable URL. Missing means "publish without an image". */
  mediaUrl?: string;
  /** `true` when no byte was actually stored, so the form can warn the admin. */
  simulated: boolean;
}

/** Shown when the direct PUT to storage fails. */
export const UPLOAD_FAILED_MESSAGE =
  'No se pudo subir la imagen al almacenamiento. Inténtalo de nuevo o publica el avance sin imagen.';

/**
 * Public base URL of the storage bucket, or `undefined` when it is not set.
 *
 * Read as a literal `process.env.<NAME>` member access on purpose: that is the
 * only form Next replaces at build time with the value baked into the browser
 * bundle. A dynamic lookup (`process.env[name]`) would compile to `undefined` in
 * the browser and silently turn every upload into a simulated one.
 */
function publicBaseUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_URL;
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * `${base}/${key}` with exactly one slash in the joint.
 *
 * Both sides are normalized because both come from a human: the environment
 * variable of a deployment usually ends in `/`, and a storage key that starts
 * with `/` would produce `https://host//uploads/x.jpg` -- a different path for
 * most object stores, not a cosmetic detail.
 */
export function composePublicUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

/**
 * Asks the API to sign an upload and, when storage is real, sends the bytes.
 *
 * Throws only when the transfer itself failed: everything else resolves, so the
 * form can keep going and publish the update without an image.
 */
export async function signAndUpload(file: File): Promise<SignAndUploadResult> {
  // Through `browserApi`, which is the gateway: the signature needs the admin
  // access token and that token lives in an httpOnly cookie the browser cannot
  // read.
  const signed = await browserApi.uploads.sign({
    filename: file.name,
    // Some browsers hand over an empty `type` for an unknown extension, and
    // `uploadSignSchema.contentType` is `min(1)`: an empty string would be
    // rejected by the API with a validation error the admin cannot act on.
    contentType: file.type === '' ? 'application/octet-stream' : file.type,
  });

  const baseUrl = publicBaseUrl();

  // Two ways to end up with no usable image, and they collapse into the same
  // answer: the API has no storage (`simulated`), or the panel does not know
  // the public base URL and therefore could not build a link to the object even
  // if the PUT succeeded. Uploading bytes nobody can reference is pointless, so
  // no request is made in either case.
  if (signed.simulated || baseUrl === undefined) return { simulated: true };

  // Direct to the signed URL, deliberately NOT through `/api/gateway`: the
  // panel does not proxy bytes (rule 40, "el admin no proxea bytes"). Routing a
  // file through the Next server would double the transfer, hold it in the
  // route handler's memory and gain nothing -- the signed URL already carries
  // its own authorization.
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type === '' ? 'application/octet-stream' : file.type,
    },
  });

  // No `mediaUrl` is returned on failure, ever: answering with the composed URL
  // of an object that was never stored would persist a broken link in
  // `mediaKey` (fact 3 above) and the admin would see the update as fine.
  if (!response.ok) throw new Error(UPLOAD_FAILED_MESSAGE);

  return { mediaUrl: composePublicUrl(baseUrl, signed.key), simulated: false };
}
