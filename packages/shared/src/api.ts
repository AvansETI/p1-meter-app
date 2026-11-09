/** Base path of all API routes. */
export const API_BASE = '/api/v1';

/** Response body of `GET /api/v1/health`. */
export interface HealthResponse {
  status: 'ok';
  version: string;
  uptimeSec: number;
}

export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.status === 'ok' && typeof v.version === 'string' && typeof v.uptimeSec === 'number';
}
