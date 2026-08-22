import { z } from 'zod';
import { ProjectStatus } from '../enums';
import { zoneSlugSchema } from './catalog';

export const createProjectSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres').max(120, 'Maximo 120 caracteres'),
  summary: z.string().max(200, 'Maximo 200 caracteres'),
  description: z.string().min(10, 'Minimo 10 caracteres'),
  zoneSlug: zoneSlugSchema,
  status: z
    .enum([ProjectStatus.PLANNED, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED])
    .default(ProjectStatus.ACTIVE),
  progress: z
    .number()
    .int('Debe ser un numero entero')
    .min(0, 'Minimo 0')
    .max(100, 'Maximo 100')
    .default(0),
  targetDate: z.iso.datetime('Fecha invalida').optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  coverKey: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const publishUpdateSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres').max(120, 'Maximo 120 caracteres'),
  body: z.string().min(10, 'Minimo 10 caracteres'),
  progress: z.number().int('Debe ser un numero entero').min(0, 'Minimo 0').max(100, 'Maximo 100'),
  mediaUrl: z.url('URL invalida').optional(),
});
export type PublishUpdateInput = z.infer<typeof publishUpdateSchema>;
