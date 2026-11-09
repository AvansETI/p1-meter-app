import {
  liveStatus,
  netKw,
  type Capabilities,
  type GasSeries,
  type LiveSnapshot,
  type RecentSeries,
  type TodayTotals,
} from '@p1/shared';
import { LRUCache } from 'lru-cache';
import type { CounterField, HouseholdDataSource, PowerPoint } from '../data/source';
import { localMidnight } from '../time';
import { HOUR_MS, detectHourlyUpdates, hourStart, hourlyGas } from './gas';

const MINUTE_MS = 60_000;
const round = (value: number, decimals: number) => Number(value.toFixed(decimals));

/** Turns a raw point into what the client shows; status is judged by age, not by count. */
export function toSnapshot(point: PowerPoint, now = Date.now()): LiveSnapshot {
  const ageSec = Math.max(0, Math.round((now - Date.parse(point.time)) / 1000));
  return {
    time: point.time,
    ageSec,
    status: liveStatus(ageSec),
    importKw: point.importKw,
    exportKw: point.exportKw,
    netKw: netKw(point.importKw, point.exportKw),
  };
}

/**
 * Live, today and recent data for one household, with short caches. Applies the household's
 * counter orientation, so callers never deal with raw (possibly swapped) field names.
 */
export class LiveService {
  private readonly points = new LRUCache<string, { point: PowerPoint | null }>({
    max: 10_000,
    ttl: 5_000,
  });
  private readonly lastPoints = new LRUCache<string, { point: PowerPoint | null }>({
    max: 10_000,
    ttl: MINUTE_MS,
  });
  private readonly today = new LRUCache<string, TodayTotals>({ max: 10_000, ttl: MINUTE_MS });
  private readonly recent = new LRUCache<string, RecentSeries>({ max: 10_000, ttl: MINUTE_MS });
  private readonly gas = new LRUCache<string, GasSeries>({ max: 10_000, ttl: MINUTE_MS });

  constructor(private readonly source: HouseholdDataSource) {}

  /** Stores fresh points from the poller, so request handlers share them. */
  remember(points: Map<string, PowerPoint>): void {
    for (const [signature, point] of points) this.points.set(signature, { point });
  }

  async snapshot(signature: string): Promise<LiveSnapshot | null> {
    let cached = this.points.get(signature);
    if (!cached) {
      cached = { point: (await this.source.latest([signature])).get(signature) ?? null };
      this.points.set(signature, cached);
    }
    const point = cached.point ?? (await this.lastPoint(signature));
    return point ? toSnapshot(point) : null;
  }

  /** Most recent point within 30 days; used when nothing arrived in the last 10 minutes. */
  async lastPoint(signature: string): Promise<PowerPoint | null> {
    let cached = this.lastPoints.get(signature);
    if (!cached) {
      cached = { point: await this.source.lastPoint(signature) };
      this.lastPoints.set(signature, cached);
    }
    return cached.point;
  }

  async todayTotals(signature: string, capabilities: Capabilities): Promise<TodayTotals> {
    const cached = this.today.get(signature);
    if (cached) return cached;

    const importField = capabilities.importCounter;
    const exportField: CounterField =
      importField === 'energy_consumed' ? 'energy_produced' : 'energy_consumed';
    const fields: CounterField[] = [importField];
    if (capabilities.hasExport) fields.push(exportField);
    if (capabilities.hasGas) fields.push('gas_delivered');

    const since = localMidnight();
    const deltas = await this.source.counterDeltas(signature, since, fields);
    const importKwh = deltas[importField] ?? 0;
    const totals: TodayTotals = { since: since.toISOString(), importKwh: round(importKwh, 3) };
    if (capabilities.hasExport) {
      const exportKwh = deltas[exportField] ?? 0;
      totals.exportKwh = round(exportKwh, 3);
      totals.netKwh = round(importKwh - exportKwh, 3);
    }
    if (capabilities.hasGas) totals.gasM3 = round(deltas.gas_delivered ?? 0, 3);

    this.today.set(signature, totals);
    return totals;
  }

  /** Gas use per hour for the last 24 hours (docs/design/2026-11-09-gas-chart.md). */
  async gasSeries(signature: string, now = Date.now()): Promise<GasSeries> {
    const cached = this.gas.get(signature);
    if (cached) return cached;
    // One extra hour before the first displayed hour as baseline.
    const from = new Date(hourStart(now) - 24 * HOUR_MS);
    const data = await this.source.gasHourly(signature, from);
    const series: GasSeries = {
      hourlyUpdates: detectHourlyUpdates(data.increaseTimes),
      hours: hourlyGas(data.lastPerHour, now),
    };
    this.gas.set(signature, series);
    return series;
  }

  async recentSeries(signature: string): Promise<RecentSeries> {
    const cached = this.recent.get(signature);
    if (cached) return cached;
    const windows = await this.source.recentPower(signature);
    const series: RecentSeries = {
      stepSec: 300,
      points: windows.map(({ t, importKw, exportKw }) => ({
        t,
        // No import value means the logger sent nothing in this window: a gap.
        netKw: importKw === null ? null : netKw(importKw, exportKw ?? 0),
      })),
    };
    this.recent.set(signature, series);
    return series;
  }
}
