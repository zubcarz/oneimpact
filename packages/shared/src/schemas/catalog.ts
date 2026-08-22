import { z } from 'zod';

export const zoneSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener minusculas, numeros y guiones');
export type ZoneSlug = z.infer<typeof zoneSlugSchema>;
