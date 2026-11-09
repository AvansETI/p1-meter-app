import type { Totals } from '@p1/shared';

export type Stream = 'import' | 'export' | 'net' | 'gas';
export type Tone = 'good' | 'bad' | 'neutral';

export interface Comparison {
  /** Rounded percentage change; negative = less than the previous period. */
  percent: number;
  tone: Tone;
}

const value = (totals: Totals, stream: Stream) =>
  ({
    import: totals.importKwh,
    export: totals.exportKwh,
    net: totals.netKwh,
    gas: totals.gasM3,
  })[stream];

/**
 * Change of a stream compared with the previous period (docs/design/2026-11-09-history.md §4).
 * Less import, net or gas is good; more export is good; under 2 % is neutral. Returns
 * 'incomplete' when either period lacks data and null when there is nothing to compare.
 */
export function compare(
  current: Totals,
  previous: Totals | null,
  stream: Stream,
): Comparison | 'incomplete' | null {
  if (!previous) return null;
  const now = value(current, stream);
  const before = value(previous, stream);
  if (now === null || now === undefined || before === null || before === undefined) return null;
  if (!current.complete || !previous.complete) return 'incomplete';
  if (before === 0) return null;
  const percent = Math.round(((now - before) / Math.abs(before)) * 100);
  if (Math.abs(percent) < 2) return { percent, tone: 'neutral' };
  const higherIsGood = stream === 'export';
  return { percent, tone: percent > 0 === higherIsGood ? 'good' : 'bad' };
}
