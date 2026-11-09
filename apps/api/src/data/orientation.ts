import type { Capabilities } from '@p1/shared';

/** Aggregates for one local day of one household. */
export interface DayStats {
  /** Number of `power_consumed` points that day. */
  points: number;
  /** Integral of `power_consumed` over the day, in kWh. */
  importKwh: number | null;
  /** Daily increase of the `energy_consumed` counter, in kWh. */
  deltaConsumed: number | null;
  /** Daily increase of the `energy_produced` counter, in kWh. */
  deltaProduced: number | null;
}

export interface OrientationOptions {
  /** A day counts as complete with at least this share of the household's median daily points. */
  minCompleteness?: number;
  minImportKwh?: number;
  minValidDays?: number;
  minAgreement?: number;
}

type Orientation = Pick<Capabilities, 'counterOrientation' | 'importCounter'>;

/**
 * Decides which energy counter holds the import (grid → home) energy by comparing it with
 * the integrated import power on complete days. Some meters report the counters swapped,
 * most likely due to a wiring fault; see docs/design/2026-11-09-emon-id-session.md §5.3.
 */
export function decideOrientation(
  days: DayStats[],
  {
    minCompleteness = 0.9,
    minImportKwh = 1,
    minValidDays = 3,
    minAgreement = 0.8,
  }: OrientationOptions = {},
): Orientation {
  // The send interval differs per kit and over time (observed 20–33 s), so completeness is
  // judged against the household's own typical day rather than a fixed sample interval.
  const expectedPoints = median(days.map((day) => day.points).filter((points) => points > 0));
  let asNamed = 0;
  let swapped = 0;

  for (const day of days) {
    const { points, importKwh, deltaConsumed, deltaProduced } = day;
    if (points < expectedPoints * minCompleteness) continue;
    if (importKwh === null || importKwh < minImportKwh) continue;
    if (deltaConsumed === null || deltaProduced === null) continue;
    if (Math.abs(deltaConsumed - importKwh) <= Math.abs(deltaProduced - importKwh)) asNamed++;
    else swapped++;
  }

  const valid = asNamed + swapped;
  if (valid >= minValidDays) {
    if (asNamed / valid >= minAgreement) {
      return { counterOrientation: 'as-named', importCounter: 'energy_consumed' };
    }
    if (swapped / valid >= minAgreement) {
      return { counterOrientation: 'swapped', importCounter: 'energy_produced' };
    }
  }
  return { counterOrientation: 'unknown', importCounter: 'energy_consumed' };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
