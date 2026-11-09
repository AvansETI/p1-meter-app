import { z } from 'zod';

/** Base path of all API routes. */
export const API_BASE = '/api/v1';

/** Header carrying the session ID on authenticated requests. */
export const SESSION_HEADER = 'x-session';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptimeSec: z.number(),
  /** Last known InfluxDB status; 'unknown' until the first background check finished. */
  influx: z.enum(['ok', 'unavailable', 'unknown']).optional(),
  /** Price job status per source; absent when the job is disabled. */
  prices: z
    .object({
      electricity: z.enum(['pending', 'ok', 'backoff']),
      gas: z.enum(['pending', 'ok', 'backoff']),
    })
    .optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export function isHealthResponse(value: unknown): value is HealthResponse {
  return HealthResponseSchema.safeParse(value).success;
}

export const SessionRequestSchema = z.object({
  emonId: z.string().max(64),
});
export type SessionRequest = z.infer<typeof SessionRequestSchema>;

export const CapabilitiesSchema = z.object({
  hasGas: z.boolean(),
  hasExport: z.boolean(),
  /** Influx field that holds the import (grid → home) counter for this household. */
  importCounter: z.enum(['energy_consumed', 'energy_produced']),
  counterOrientation: z.enum(['as-named', 'swapped', 'unknown']),
  /** ISO timestamp of the most recent data point. */
  lastSeen: z.string(),
});
export type Capabilities = z.infer<typeof CapabilitiesSchema>;

export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  signature: z.string(),
  capabilities: CapabilitiesSchema,
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const API_ERRORS = [
  'invalid_format',
  'not_found',
  'rate_limited',
  'session_expired',
  'upstream_unavailable',
  /** The data was changed by someone else since it was loaded. */
  'conflict',
] as const;
export type ApiErrorCode = (typeof API_ERRORS)[number];

export const ErrorResponseSchema = z.object({ error: z.enum(API_ERRORS) });
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
