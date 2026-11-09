import {
  formatPlainDate,
  shiftPeriod,
  type Capabilities,
  type History,
  type HistoryBucket,
  type Period,
  type PlainDate,
  type Totals,
} from '@p1/shared';
import { LRUCache } from 'lru-cache';
import type { CounterField, HouseholdDataSource } from '../data/source';
import { zonedDate } from '../time';
import { bucketDeltas, periodBounds, type BucketDelta } from './buckets';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const round = (value: number) => Math.round(value * 1000) / 1000;
const sum = (values: Array<number | null | undefined>) => {
  const present = values.filter((v): v is number => typeof v === 'number');
  return present.length === 0 ? null : round(present.reduce((a, b) => a + b, 0));
};

const HOUR_MS = 3_600_000;
/**
 * How far back a boundary lookup may search for the last counter value. Kits regularly miss a
 * few minutes to hours; a longer lookback for larger buckets avoids marking a whole day or
 * month as a gap, at the cost of attributing those missing hours to the next bucket.
 */
const LOOKBACK_MS: Record<Period, number> = {
  day: HOUR_MS,
  week: 6 * HOUR_MS,
  month: 6 * HOUR_MS,
  year: 3 * DAY_MS,
};
/** Fallback baseline when the period start has no recent value (e.g. after a long gap). */
const LONG_LOOKBACK_MS = 400 * DAY_MS;

/** History per period with totals and comparison (docs/design/2026-11-09-history.md). */
export class HistoryService {
  private readonly cache = new LRUCache<string, History>({ max: 5_000, ttl: MINUTE_MS });
  private readonly firstData = new LRUCache<string, { date: string | null }>({
    max: 10_000,
    ttl: 30 * DAY_MS,
  });

  constructor(private readonly source: HouseholdDataSource) {}

  async history(
    signature: string,
    capabilities: Capabilities,
    period: Period,
    date: PlainDate,
    now = Date.now(),
  ): Promise<History> {
    const bounds = periodBounds(date, period);
    const key = `${signature}|${period}|${bounds.start}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const importField = capabilities.importCounter;
    const exportField: CounterField =
      importField === 'energy_consumed' ? 'energy_produced' : 'energy_consumed';
    const fields: CounterField[] = [importField];
    if (capabilities.hasExport) fields.push(exportField);
    if (capabilities.hasGas) fields.push('gas_delivered');

    // Counter value at every bucket boundary up to now: the value at a bucket's end is the last
    // value in that bucket. Small lookups instead of scanning all points (a year has ~1.5 M).
    const boundaries = [bounds.start, ...bounds.bucketStarts.slice(1), bounds.end];
    const instants: Date[] = [];
    for (const boundary of boundaries) {
      instants.push(new Date(Math.min(boundary, now)));
      if (boundary >= now) break;
    }
    const [at, [before], previous, firstData] = await Promise.all([
      this.source.countersAt(signature, fields, instants, LOOKBACK_MS[period]),
      this.source.countersAt(signature, fields, [new Date(bounds.start)], LONG_LOOKBACK_MS),
      this.previousTotals(signature, fields, capabilities, period, date, bounds, now),
      this.firstDataDate(signature),
    ]);

    const deltas = (field: CounterField): BucketDelta[] => {
      const last = new Map<number, number>();
      const baseline = at[0]?.[field];
      const older = before?.[field];
      if (baseline !== undefined) last.set(bounds.baselineStart, baseline);
      else if (older !== undefined) last.set(bounds.baselineStart - 1, older);
      bounds.bucketStarts.forEach((start, i) => {
        const value = at[i + 1]?.[field];
        if (value !== undefined) last.set(start, value);
      });
      return bucketDeltas(last, bounds.bucketStarts, bounds.baselineStart, now);
    };
    const imports = deltas(importField);
    const exports = capabilities.hasExport ? deltas(exportField) : undefined;
    const gas = capabilities.hasGas ? deltas('gas_delivered') : undefined;

    const buckets: HistoryBucket[] = bounds.bucketStarts.map((start, i) => {
      const imp = imports[i]!;
      const exp = exports?.[i];
      const g = gas?.[i];
      const bucket: HistoryBucket = { start: new Date(start).toISOString(), importKwh: imp.value };
      if (exp) {
        bucket.exportKwh = exp.value;
        bucket.netKwh =
          imp.value !== null && exp.value !== null ? round(imp.value - exp.value) : null;
      }
      if (g) bucket.gasM3 = g.value;
      const gapStarts = [imp, exp, g].flatMap((x) => (x?.gapStart ? [x.gapStart] : []));
      if (gapStarts.length > 0) {
        bucket.spansGap = true;
        bucket.gapStart = new Date(Math.min(...gapStarts)).toISOString();
      }
      return bucket;
    });

    const past = imports.filter((x) => x.start <= now);
    const totals: Totals = {
      importKwh: sum(buckets.map((b) => b.importKwh)),
      complete:
        past.length > 0 &&
        past.every((x) => x.value !== null) &&
        !(imports[0]?.gapStart !== undefined && imports[0].gapStart < bounds.start),
    };
    if (capabilities.hasExport) {
      totals.exportKwh = sum(buckets.map((b) => b.exportKwh));
      totals.netKwh =
        totals.importKwh !== null && totals.exportKwh !== null
          ? round(totals.importKwh - totals.exportKwh)
          : null;
    }
    if (capabilities.hasGas) totals.gasM3 = sum(buckets.map((b) => b.gasM3));

    const history: History = {
      period,
      start: new Date(bounds.start).toISOString(),
      end: new Date(bounds.end).toISOString(),
      firstData: firstData ?? formatPlainDate(date),
      buckets,
      totals,
      previous,
    };
    // Completed periods do not change any more; the current one is refreshed every minute.
    this.cache.set(key, history, { ttl: now >= bounds.end ? DAY_MS : MINUTE_MS });
    return history;
  }

  /** Totals of the previous period; for the current period only its elapsed part. */
  private async previousTotals(
    signature: string,
    fields: CounterField[],
    capabilities: Capabilities,
    period: Period,
    date: PlainDate,
    bounds: { start: number; end: number },
    now: number,
  ): Promise<Totals | null> {
    const prev = periodBounds(shiftPeriod(date, period, -1), period);
    const cutoff = now < bounds.end ? prev.start + Math.max(0, now - bounds.start) : prev.end;
    const [atStart, atCutoff] = await this.source.countersAt(
      signature,
      fields,
      [new Date(prev.start), new Date(cutoff)],
      LOOKBACK_MS[period],
    );
    const delta = (field: CounterField) => {
      const a = atStart?.[field];
      const b = atCutoff?.[field];
      return a === undefined || b === undefined || b < a ? null : round(b - a);
    };
    const importKwh = delta(capabilities.importCounter);
    if (importKwh === null) return null;
    const exportField: CounterField =
      capabilities.importCounter === 'energy_consumed' ? 'energy_produced' : 'energy_consumed';
    const totals: Totals = { importKwh, complete: true };
    if (capabilities.hasExport) {
      totals.exportKwh = delta(exportField);
      totals.netKwh = totals.exportKwh === null ? null : round(importKwh - totals.exportKwh);
      if (totals.exportKwh === null) totals.complete = false;
    }
    if (capabilities.hasGas) {
      totals.gasM3 = delta('gas_delivered');
      if (totals.gasM3 === null) totals.complete = false;
    }
    return totals;
  }

  private async firstDataDate(signature: string): Promise<string | null> {
    const cached = this.firstData.get(signature);
    if (cached) return cached.date;
    const first = await this.source.firstPoint(signature);
    const date = first ? formatPlainDate(zonedDate(first)) : null;
    this.firstData.set(signature, { date });
    return date;
  }
}
