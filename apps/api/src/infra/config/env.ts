import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me'),
  CORS_ORIGINS: z.string().default('http://localhost:5001'),
  AUTH_THROTTLE_LIMIT: z.coerce.number().default(10),
  AUTH_THROTTLE_TTL_MS: z.coerce.number().default(60000),
  // Artificial latency of `PaymentsService.simulate` on the approved path
  // (`backend-nest.md`, "Pago simulado"). Optional: defaults to ~800 ms in
  // development/production. Set to 0 in test envs (see `.env.example`) so
  // unit and e2e suites do not pay real wall-clock time for every payment.
  PAYMENT_SIMULATION_DELAY_MS: z.coerce.number().int().min(0).default(800),
  // `OutboxRelay` tick cadence: how often it polls `OutboxEvent` for
  // unprocessed rows. 1s keeps the demo feeling near-real-time without
  // hammering Postgres between ticks.
  OUTBOX_RELAY_INTERVAL_MS: z.coerce.number().int().min(1).default(1000),
  // Max rows `OutboxRelay` pulls per tick, so a burst of events (e.g. a
  // subscription activation cascading into several listeners) never turns
  // into an unbounded query.
  OUTBOX_RELAY_BATCH_SIZE: z.coerce.number().int().min(1).default(20),
  // After this many failed delivery attempts, `OutboxRepository.findPendingBatch`
  // stops returning the row: it is effectively "dead" without a separate
  // status column (see plan decision D1).
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  // Supabase Storage, used by `StorageService` (`src/infra/storage`) to sign
  // upload URLs for `POST /v1/uploads/sign`. All three are OPTIONAL and only
  // meaningful together: if any is missing, `StorageService` falls back to a
  // local, non-functional URL with `simulated: true` (decision D6 of
  // `.claude/plans/20260822-api-payments-subscriptions-events.plan.md`)
  // instead of failing startup or the request.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),
});
export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
