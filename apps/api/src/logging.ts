import { maskSignature } from '@p1/shared';
import type { FastifyServerOptions } from 'fastify';
import type { Config } from './config';

const SIGNATURE_IN_TEXT = /\b\d{4}-[A-Z]{3}-[A-Z]{4}-V\d{2}-[0-9A-F]{6}-[0-9A-F]{6}\b/g;

/** Replaces every signature in strings, arrays and plain objects with its masked form. */
export function maskSignatures<T>(value: T, depth = 0): T {
  if (typeof value === 'string') {
    return value.replace(SIGNATURE_IN_TEXT, (match) => maskSignature(match)) as T;
  }
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => maskSignatures(item, depth + 1)) as T;
  }
  if (value.constructor !== Object) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, maskSignatures(item, depth + 1)]),
  ) as T;
}

/** Pino options; full signatures never reach the logs (docs/design/2026-11-09-emon-id-session.md §5.7). */
export function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  return {
    level: config.LOG_LEVEL,
    formatters: { log: (object) => maskSignatures(object) },
    serializers: {
      // The SSE route carries the session ID in the query string; keep it out of the logs.
      req: (req: { method: string; url: string; ip?: string }) => ({
        method: req.method,
        url: req.url.split('?')[0],
        ip: req.ip,
      }),
    },
    hooks: {
      logMethod(args, method) {
        method.apply(this, maskSignatures(args));
      },
    },
    ...(config.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
  };
}
