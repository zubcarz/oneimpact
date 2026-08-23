import { createZodDto } from 'nestjs-zod';
import { signedUploadSchema } from '@oneimpact/shared';

/**
 * Response DTO for `POST /v1/uploads/sign` (`UploadsController`), generated
 * from the single `@oneimpact/shared` contract (`signedUploadSchema`). Never
 * redeclare fields here. `simulated: true` (decision D6) means `uploadUrl`
 * is a non-functional placeholder, not a real Supabase Storage target.
 */
export class SignedUploadDto extends createZodDto(signedUploadSchema) {}
