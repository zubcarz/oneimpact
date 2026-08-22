import type { z } from 'zod';
import type { Plan } from '../plans';
import type {
  zoneSchema,
  projectSchema,
  projectUpdateSchema,
  projectWithUpdatesSchema,
} from '../schemas/catalog';

export type { Plan };

export type Zone = z.infer<typeof zoneSchema>;

export type Project = z.infer<typeof projectSchema>;

export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

export type ProjectWithUpdates = z.infer<typeof projectWithUpdatesSchema>;
