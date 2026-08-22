import { z } from 'zod';
import { PlanId, ProjectStatus } from '../enums';

export const zoneSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener minusculas, numeros y guiones');
export type ZoneSlug = z.infer<typeof zoneSlugSchema>;

export const planSchema = z.object({
  id: z.enum([PlanId.BASICO, PlanId.ESTANDAR, PlanId.PREMIUM]),
  name: z.string(),
  monthlyPrice: z.number(),
  annualMonthlyPrice: z.number(),
  annualTotal: z.number(),
  recommended: z.boolean().optional(),
});

export const zoneSchema = z.object({
  id: z.string(),
  slug: zoneSlugSchema,
  name: z.string(),
  description: z.string(),
  imageKey: z.string(),
  order: z.number(),
});

export const projectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  zoneId: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  status: z.enum([ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED]),
  progress: z.number().int('Debe ser un numero entero').min(0, 'Minimo 0').max(100, 'Maximo 100'),
  targetDate: z.iso.datetime('Fecha invalida').optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  coverKey: z.string().optional(),
  createdAt: z.iso.datetime('Fecha invalida'),
});

export const projectUpdateSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  body: z.string(),
  progress: z.number().int('Debe ser un numero entero').min(0, 'Minimo 0').max(100, 'Maximo 100'),
  mediaKey: z.string().optional(),
  publishedAt: z.iso.datetime('Fecha invalida'),
  authorId: z.string().optional(),
});

export const projectWithUpdatesSchema = projectSchema.extend({
  updates: z.array(projectUpdateSchema),
  zone: zoneSchema.optional(),
});

export function listResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number(),
  });
}
