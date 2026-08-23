import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me'),
  CORS_ORIGINS: z.string().default('http://localhost:3001'),
  AUTH_THROTTLE_LIMIT: z.coerce.number().default(10),
  AUTH_THROTTLE_TTL_MS: z.coerce.number().default(60000),
  // Artificial latency of `PaymentsService.simulate` on the approved path
  // (`backend-nest.md`, "Pago simulado"). Optional: defaults to ~800 ms in
  // development/production. Set to 0 in test envs (see `.env.example`) so
  // unit and e2e suites do not pay real wall-clock time for every payment.
  PAYMENT_SIMULATION_DELAY_MS: z.coerce.number().int().min(0).default(800),
});
export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
