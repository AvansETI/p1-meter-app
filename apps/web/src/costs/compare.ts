import type { CostTotals } from '@p1/shared';
import type { Comparison } from '../history/comparison';

/** How much the comparison contract differs from the own one (positive = more expensive). */
export function contractDifference(
  own: number | null | undefined,
  other: number | null | undefined,
): { amount: number; tone: 'cheaper' | 'dearer' | 'same' } | null {
  if (own === null || own === undefined || other === null || other === undefined) return null;
  const amount = Math.round((other - own) * 100) / 100;
  return {
    amount: Math.abs(amount),
    tone: amount < 0 ? 'cheaper' : amount > 0 ? 'dearer' : 'same',
  };
}

/**
 * Change of the own costs versus the previous period, like the usage comparison: lower costs
 * are good, under 2 % is neutral; 'incomplete' when either side misses days.
 */
export function costChange(
  current: CostTotals,
  previous: CostTotals | null,
): Comparison | 'incomplete' | null {
  if (!previous || current.own === null || previous.own === null) return null;
  if (!current.complete || !previous.complete) return 'incomplete';
  if (previous.own === 0) return null;
  const percent = Math.round(((current.own - previous.own) / Math.abs(previous.own)) * 100);
  if (Math.abs(percent) < 2) return { percent, tone: 'neutral' };
  return { percent, tone: percent < 0 ? 'good' : 'bad' };
}
