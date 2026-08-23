import { createZodDto } from 'nestjs-zod';
import { registerSchema } from '@oneimpact/shared';

/** Request DTO for `POST /v1/auth/register`, from the single `@oneimpact/shared` contract. */
export class RegisterDto extends createZodDto(registerSchema) {}
