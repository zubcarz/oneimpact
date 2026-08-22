import { z } from 'zod';
import { Role } from '../enums';

export const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email('Email inválido'),
  name: z.string(),
  role: z.enum([Role.USER, Role.ADMIN]),
});

export const authTokensSchema = z.object({
  accessToken: z.string().min(1, 'Token de acceso requerido'),
  refreshToken: z.string().min(1, 'Token de refresco requerido'),
});

export const authResponseSchema = z.object({
  user: userProfileSchema,
  tokens: authTokensSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Token de refresco requerido'),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * `.strict()` es la invariante de "el rol nunca es editable por el propio
 * usuario": un payload con un campo `role` extra debe fallar la validacion en
 * lugar de ser ignorado silenciosamente.
 */
export const updateProfileSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum([Role.USER, Role.ADMIN], 'Rol inválido'),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
