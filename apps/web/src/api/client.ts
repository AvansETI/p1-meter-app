import {
  API_BASE,
  CapabilitiesSchema,
  GasSeriesSchema,
  HistorySchema,
  TariffsResponseSchema,
  CostsTodaySchema,
  TariffVersionSchema,
  LiveSnapshotSchema,
  RecentSeriesSchema,
  StatsResponseSchema,
  TodayTotalsSchema,
  ErrorResponseSchema,
  GasAnalysisSchema,
  GasComparisonSchema,
  GasHourlySchema,
  SESSION_HEADER,
  SessionResponseSchema,
  type ApiErrorCode,
  type Capabilities,
  type GasSeries,
  type History,
  type TariffProfiles,
  type CostsToday,
  type TariffsResponse,
  type TariffVersion,
  type Period,
  type LiveSnapshot,
  type RecentSeries,
  type TodayTotals,
  type SessionResponse,
  type StatsResponse,
  type GasAnalysis,
  type GasAnalysisQuery,
  type GasComparison,
  type GasHourly,
  type GasProfile,
} from '@p1/shared';
import { z } from 'zod';

/** Query string of the profile; empty fields are left out. */
function profileQuery(profile: GasProfile): string {
  return new URLSearchParams(
    Object.entries(profile).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]],
    ),
  ).toString();
}

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

  /** Active users and meter kits (#63); public, no session needed. */
  getStats(): Promise<ApiResult<StatsResponse>> {
    return call('/stats', {}, StatsResponseSchema);
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

  getCostsToday(): Promise<ApiResult<CostsToday>> {
    return this.authorized('/costs/today', {}, CostsTodaySchema);
  }

  getTariffs(): Promise<ApiResult<TariffsResponse>> {
    return this.authorized('/tariffs', {}, TariffsResponseSchema);
  }

  /** Saves if `version` is still current; otherwise the result is `conflict`. */
  saveTariffs(profiles: TariffProfiles, version: number): Promise<ApiResult<TariffsResponse>> {
    return this.authorized(
      '/tariffs',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'if-match': String(version) },
        body: JSON.stringify({ profiles }),
      },
      TariffsResponseSchema,
    );
  }

  getTariffVersions(): Promise<ApiResult<TariffVersion[]>> {
    return this.authorized('/tariffs/versions', {}, TariffVersionSchema.array());
  }

  restoreTariffVersion(version: number): Promise<ApiResult<TariffsResponse>> {
    return this.authorized(
      `/tariffs/versions/${version}/restore`,
      { method: 'POST' },
      TariffsResponseSchema,
    );
  }

  getHistory(period: Period, date: string): Promise<ApiResult<History>> {
    const query = new URLSearchParams({ period, date }).toString();
    return this.authorized(`/history?${query}`, {}, HistorySchema);
  }

  getGas(): Promise<ApiResult<GasSeries>> {
    return this.authorized('/live/gas', {}, GasSeriesSchema);
  }

  getGasAnalysis(query: GasAnalysisQuery): Promise<ApiResult<GasAnalysis>> {
    const params = new URLSearchParams(
      Object.entries(query).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, String(value)]],
      ),
    ).toString();
    return this.authorized(`/gas/analysis?${params}`, {}, GasAnalysisSchema);
  }

  getGasHourly(station: number): Promise<ApiResult<GasHourly>> {
    return this.authorized(`/gas/hourly?station=${station}`, {}, GasHourlySchema);
  }

  getGasComparison(profile: GasProfile): Promise<ApiResult<GasComparison>> {
    return this.authorized(`/gas/comparison?${profileQuery(profile)}`, {}, GasComparisonSchema);
  }

  /** Shares the dwelling profile for the group comparison (opt-in). */
  shareGasProfile(profile: GasProfile): Promise<ApiResult<undefined>> {
    return this.authorized(
      '/gas/profile',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(profile),
      },
      z.undefined(),
    );
  }

  unshareGasProfile(): Promise<ApiResult<undefined>> {
    return this.authorized('/gas/profile', { method: 'DELETE' }, z.undefined());
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
