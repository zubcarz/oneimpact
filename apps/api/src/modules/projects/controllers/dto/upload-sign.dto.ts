import { createZodDto } from 'nestjs-zod';
import { uploadSignSchema } from '@oneimpact/shared';

/**
 * Request DTO for `POST /v1/uploads/sign` (`UploadsController`), generated
 * from the single `@oneimpact/shared` contract (`uploadSignSchema`). Never
 * redeclare fields here.
 */
export class UploadSignDto extends createZodDto(uploadSignSchema) {}
