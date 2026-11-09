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
  /** Points expected on a complete day (86400 s / sample interval). */
  expectedPoints: number;
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
    expectedPoints,
    minCompleteness = 0.95,
    minImportKwh = 1,
    minValidDays = 3,
    minAgreement = 0.8,
  }: OrientationOptions,
): Orientation {
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
