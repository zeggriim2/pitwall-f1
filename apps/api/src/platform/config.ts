import { z } from 'zod'

/**
 * Configuration is parsed once, at boot, and fails fast with a readable error.
 * Every other module receives typed values — never `process.env`.
 */
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().default(3000),
  PUBLIC_API_URL: z.url().default('http://localhost:3000'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:8080,http://localhost:8081')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  DATABASE_URL: z.url().default('postgres://pitwall:pitwall@localhost:5432/pitwall'),
  REDIS_URL: z.url().default('redis://localhost:6379'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  OPENF1_BASE_URL: z.url().default('https://api.openf1.org/v1'),
  /** OpenF1's free tier allows ~30 req/min: 2.1 s between calls keeps us under it. */
  OPENF1_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(2100),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  /** Fuel burn makes cars faster every lap; we add it back to isolate tyre wear. */
  FUEL_EFFECT_SECONDS_PER_LAP: z.coerce.number().nonnegative().default(0.035),
})

export type Config = z.infer<typeof Env>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env)
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}
