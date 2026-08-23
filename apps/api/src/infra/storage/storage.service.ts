import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SignedUpload, UploadSignInput } from '@oneimpact/shared';
import { DomainError } from '../../common/errors/domain-error';

/** Arbitrary, short TTL for the local fallback URL -- it is never fetched. */
const LOCAL_FALLBACK_TTL_MS = 15 * 60 * 1000;

/**
 * Supabase's `createSignedUploadUrl` (the `supabase-js` method this branch
 * mirrors) does not let the caller choose a TTL; its documented behavior is a
 * signed upload URL valid for 2 hours from issuance. This value is used only
 * to fill `SignedUpload.expiresAt` in the response -- the actual expiry is
 * enforced by Supabase itself, not by this API.
 *
 * SIN CONFIRMAR: this branch has never been exercised against a real
 * Supabase project in this environment (no credentials available here), see
 * the phase-3 risk note in
 * `.claude/plans/20260822-api-payments-subscriptions-events.plan.md`.
 */
const SUPABASE_SIGNED_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

interface ResolvedStorageEnv {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

/**
 * Infrastructure service (not a domain module): signs an upload URL for the
 * admin panel/mobile to `PUT` a file to directly, so this API never proxies
 * image bytes.
 *
 * Decision D6 (`.claude/plans/20260822-api-payments-subscriptions-events.plan.md`):
 * if `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`
 * are all set, this signs against real Supabase Storage. If any is missing,
 * it returns a local, non-functional URL with `simulated: true` so the
 * caller never mistakes it for a real upload target -- the flag is the whole
 * point of the fallback, not an afterthought.
 */
@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  async signUpload(input: UploadSignInput): Promise<SignedUpload> {
    const key = this.buildKey(input.filename);
    const env = this.readEnv();

    if (!env) {
      return this.localFallback(key);
    }

    return this.signWithSupabase(env, key, input.contentType);
  }

  private readEnv(): ResolvedStorageEnv | undefined {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET');

    if (!url || !serviceRoleKey || !bucket) return undefined;
    return { url, serviceRoleKey, bucket };
  }

  /** `uploads/<uuid>-<sanitized filename>`, unique and safe as a URL path segment. */
  private buildKey(filename: string): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `uploads/${randomUUID()}-${safeName}`;
  }

  private localFallback(key: string): SignedUpload {
    return {
      // Deliberately not a resolvable URL: nothing should ever `PUT` here.
      // `simulated: true` is what stops a caller from trying anyway.
      uploadUrl: `local-simulated://uploads/${key}`,
      key,
      expiresAt: new Date(Date.now() + LOCAL_FALLBACK_TTL_MS).toISOString(),
      simulated: true,
    };
  }

  /**
   * Real branch of D6. Built directly against Supabase Storage's REST API
   * with `fetch` -- per this task's explicit instruction, no
   * `@supabase/supabase-js` dependency is added. This mirrors the documented
   * request/response shape of `storage.from(bucket).createSignedUploadUrl(path)`:
   *
   *   POST {SUPABASE_URL}/storage/v1/object/upload/sign/{bucket}/{key}
   *   headers: apikey + Authorization: Bearer <service role key>
   *   body: {}
   *   response: { url: "/object/upload/sign/{bucket}/{key}?token=..." }
   *
   * (the response `url` is relative to `{SUPABASE_URL}/storage/v1`).
   *
   * UNTESTED against a live bucket in this environment -- SIN CONFIRMAR until
   * item 14 (deploy). If Supabase's response does not match this shape, this
   * throws a typed `DomainError` instead of returning a broken URL.
   */
  private async signWithSupabase(
    env: ResolvedStorageEnv,
    key: string,
    contentType: string,
  ): Promise<SignedUpload> {
    const endpoint = `${env.url}/storage/v1/object/upload/sign/${env.bucket}/${key}`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: env.serviceRoleKey,
          Authorization: `Bearer ${env.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentType }),
      });
    } catch (error) {
      throw new DomainError(
        'STORAGE_UNAVAILABLE',
        502,
        'No se pudo contactar el almacenamiento para firmar la subida.',
        { cause: error instanceof Error ? error.message : String(error) },
      );
    }

    if (!response.ok) {
      throw new DomainError(
        'STORAGE_SIGN_FAILED',
        502,
        'El almacenamiento rechazo la solicitud de firma de subida.',
        { status: response.status },
      );
    }

    const body = (await response.json()) as { url?: string };
    if (!body.url) {
      throw new DomainError(
        'STORAGE_SIGN_FAILED',
        502,
        'La respuesta del almacenamiento no incluyo una URL firmada.',
      );
    }

    return {
      uploadUrl: `${env.url}/storage/v1${body.url}`,
      key,
      expiresAt: new Date(Date.now() + SUPABASE_SIGNED_UPLOAD_TTL_MS).toISOString(),
      simulated: false,
    };
  }
}
