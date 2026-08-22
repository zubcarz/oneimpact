import type { z } from 'zod';
import type { authResponseSchema, authTokensSchema, userProfileSchema } from '../schemas/auth';

export type AuthTokens = z.infer<typeof authTokensSchema>;

export type UserProfile = z.infer<typeof userProfileSchema>;

export type AuthResponse = z.infer<typeof authResponseSchema>;
