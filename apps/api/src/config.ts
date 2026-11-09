import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Treat empty strings (e.g. `API_PORT=` copied from .env.example) as "not set".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

const schema = z.object({
  NODE_ENV: optional(z.enum(['development', 'production', 'test']).default('development')),
  API_HOST: optional(z.string().default('127.0.0.1')),
  API_PORT: optional(z.coerce.number().int().min(1).max(65535).default(3000)),
  LOG_LEVEL: optional(
    z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ),
  // Same relative path from src/ (dev) and dist/ (production).
  WEB_DIST: optional(z.string().default(fileURLToPath(new URL('../../web/dist', import.meta.url)))),
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
