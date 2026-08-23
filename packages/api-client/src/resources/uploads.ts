import { API_PATHS } from '@oneimpact/shared';
import type { SignedUpload, UploadSignInput } from '@oneimpact/shared';
import type { RequestFn } from '../http';

export function createUploadsResource(request: RequestFn) {
  return {
    sign: (input: UploadSignInput) =>
      request<SignedUpload>(API_PATHS.uploads.sign, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  };
}
