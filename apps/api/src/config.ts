import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Treat empty strings (e.g. `API_PORT=` copied from .env.example) as "not set".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

const positiveInt = (fallback: number) =>
  optional(z.coerce.number().int().positive().default(fallback));

/** `true`/`false`, a hop count, or an IP/CIDR list — passed to Fastify's `trustProxy`. */
const trustProxy = optional(
  z
    .string()
    .default('false')
    .transform((value): boolean | number | string => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (/^\d+$/.test(value)) return Number(value);
      return value;
    }),
);

const schema = z
  .object({
    NODE_ENV: optional(z.enum(['development', 'production', 'test']).default('development')),
    API_HOST: optional(z.string().default('127.0.0.1')),
    API_PORT: optional(z.coerce.number().int().min(1).max(65535).default(3000)),
    LOG_LEVEL: optional(
      z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    ),
    // Same relative path from src/ (dev) and dist/ (production).
    WEB_DIST: optional(
      z.string().default(fileURLToPath(new URL('../../web/dist', import.meta.url))),
    ),
    TRUST_PROXY: trustProxy,

    INFLUX_URL: optional(z.url().optional()),
    INFLUX_ORG: optional(z.string().optional()),
    INFLUX_BUCKET: optional(z.string().optional()),
    INFLUX_TOKEN: optional(z.string().optional()),
    INFLUX_TIMEOUT_MS: positiveInt(10_000),

    // SQLite database and backups. systemd sets STATE_DIRECTORY (StateDirectory=); in
    // development the repository's data/ directory is used. ":memory:" for tests.
    DATA_DIR: optional(
      z
        .string()
        .default(
          process.env.STATE_DIRECTORY ?? fileURLToPath(new URL('../../../data', import.meta.url)),
        ),
    ),

    // Day-ahead prices (costs, #32); the price job only runs when all three are set.
    PRICES_INFLUX_BUCKET: optional(z.string().optional()),
    PRICES_INFLUX_TOKEN: optional(z.string().optional()),
    ENTSOE_TOKEN: optional(z.string().optional()),

    SESSION_TTL_HOURS: positiveInt(24),
    RATE_LIMIT_PER_MINUTE: positiveInt(120),
    SESSION_LIMIT_PER_MINUTE: positiveInt(10),
    SESSION_LIMIT_PER_DAY: positiveInt(50),
    FAILED_LOOKUPS_PER_HOUR: positiveInt(5),
  })
  .superRefine((config, ctx) => {
    // Tests inject a fake data source; everywhere else InfluxDB is required.
    if (config.NODE_ENV === 'test') return;
    for (const key of ['INFLUX_URL', 'INFLUX_ORG', 'INFLUX_BUCKET', 'INFLUX_TOKEN'] as const) {
      if (!config[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'is required' });
    }
  });

export type Config = z.infer<typeof schema>;

export class ConfigError extends Error {
  override name = 'ConfigError';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
    throw new ConfigError(`Invalid configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}
