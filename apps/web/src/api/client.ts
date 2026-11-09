import {
  API_BASE,
  CapabilitiesSchema,
  GasSeriesSchema,
  HistorySchema,
  LiveSnapshotSchema,
  RecentSeriesSchema,
  TodayTotalsSchema,
  ErrorResponseSchema,
  SESSION_HEADER,
  SessionResponseSchema,
  type ApiErrorCode,
  type Capabilities,
  type GasSeries,
  type History,
  type Period,
  type LiveSnapshot,
  type RecentSeries,
  type TodayTotals,
  type SessionResponse,
} from '@p1/shared';
import type { z } from 'zod';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorCode };

async function call<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    return { ok: false, error: 'upstream_unavailable' };
  }
  const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (res.ok) {
    const parsed = schema.safeParse(body);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, error: 'upstream_unavailable' };
  }
  const error = ErrorResponseSchema.safeParse(body);
  if (error.success) return { ok: false, error: error.data.error };
  return { ok: false, error: res.status === 429 ? 'rate_limited' : 'upstream_unavailable' };
}

/**
 * Talks to the API. Holds the session in memory and, when the API has forgotten it
 * (restart, expiry), silently opens a new one for the stored EMON ID and retries once.
 */
export class ApiClient {
  private sessionId: string | undefined;
  private emonId: string | undefined;
  private opening: Promise<ApiResult<SessionResponse>> | undefined;

  async openSession(emonId: string): Promise<ApiResult<SessionResponse>> {
    const result = await call(
      '/session',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emonId }),
      },
      SessionResponseSchema,
    );
    if (result.ok) {
      this.sessionId = result.data.sessionId;
      this.emonId = result.data.signature;
    }
    return result;
  }

  /** Opens a session once for concurrent callers. */
  ensureSession(emonId: string): Promise<ApiResult<SessionResponse>> {
    this.opening ??= this.openSession(emonId).finally(() => (this.opening = undefined));
    return this.opening;
  }

  getCapabilities(): Promise<ApiResult<Capabilities>> {
    return this.authorized('/capabilities', {}, CapabilitiesSchema);
  }

  getLive(): Promise<ApiResult<LiveSnapshot>> {
    return this.authorized('/live', {}, LiveSnapshotSchema);
  }

  getToday(): Promise<ApiResult<TodayTotals>> {
    return this.authorized('/live/today', {}, TodayTotalsSchema);
  }

  getHistory(period: Period, date: string): Promise<ApiResult<History>> {
    const query = new URLSearchParams({ period, date }).toString();
    return this.authorized(`/history?${query}`, {}, HistorySchema);
  }

  getGas(): Promise<ApiResult<GasSeries>> {
    return this.authorized('/live/gas', {}, GasSeriesSchema);
  }

  getRecent(): Promise<ApiResult<RecentSeries>> {
    return this.authorized('/live/recent', {}, RecentSeriesSchema);
  }

  /** URL of the live event stream; EventSource cannot send headers, so the session is a query parameter. */
  streamUrl(): string | undefined {
    return this.sessionId
      ? `${API_BASE}/live/stream?session=${encodeURIComponent(this.sessionId)}`
      : undefined;
  }

  async closeSession(): Promise<void> {
    const id = this.sessionId;
    this.sessionId = undefined;
    this.emonId = undefined;
    if (id)
      await fetch(`${API_BASE}/session`, {
        method: 'DELETE',
        headers: { [SESSION_HEADER]: id },
      }).catch(() => undefined);
  }

  private async authorized<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<ApiResult<T>> {
    const send = () =>
      call(
        path,
        { ...init, headers: { ...init.headers, [SESSION_HEADER]: this.sessionId ?? '' } },
        schema,
      );
    const first = await send();
    if (first.ok || first.error !== 'session_expired' || !this.emonId) return first;
    const reopened = await this.ensureSession(this.emonId);
    return reopened.ok ? send() : { ok: false, error: reopened.error };
  }
}

export const api = new ApiClient();
