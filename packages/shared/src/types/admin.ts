import type { z } from 'zod';
import type { outboxEventSchema, outboxEventStatusSchema } from '../schemas/admin';

export type OutboxEventStatus = z.infer<typeof outboxEventStatusSchema>;

export type OutboxEventSummary = z.infer<typeof outboxEventSchema>;
