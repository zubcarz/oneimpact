import { z } from 'zod';

export const outboxEventStatusSchema = z.enum(['PENDING', 'PROCESSED', 'FAILED']);

export const outboxEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: outboxEventStatusSchema,
  attempts: z.number(),
  lastError: z.string().optional(),
  createdAt: z.iso.datetime(),
  processedAt: z.iso.datetime().optional(),
});
