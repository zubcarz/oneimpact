import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@oneimpact/shared';

/** Request DTO for `POST /v1/auth/login`, from the single `@oneimpact/shared` contract. */
export class LoginDto extends createZodDto(loginSchema) {}
