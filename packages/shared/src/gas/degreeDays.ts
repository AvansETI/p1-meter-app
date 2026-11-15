import { z } from 'zod';

/** Degree-day methods (docs/design/2026-11-15-gas-analysis.md §3.1). */
export const DEGREE_DAY_METHODS = ['plain', 'weighted', 'effective'] as const;
export const DegreeDayMethodSchema = z.enum(DEGREE_DAY_METHODS);
export type DegreeDayMethod = z.infer<typeof DegreeDayMethodSchema>;

export const DEFAULT_BASE_TEMPERATURE = 18;
export const MIN_BASE_TEMPERATURE = 14;
export const MAX_BASE_TEMPERATURE = 20;

/** Mean weather of one local day. */
export interface DayWeather {
  /** Mean temperature, °C. */
  t: number;
  /** Mean wind speed, m/s. */
  fh: number;
}

/** Seasonal weighting: Apr–Sep 0.8, Mar and Oct 1.0, Nov–Feb 1.1. */
export function seasonWeight(month: number): number {
  if (month >= 4 && month <= 9) return 0.8;
  if (month === 3 || month === 10) return 1;
  return 1.1;
}

/** Degree days of one day in `month` (1–12). */
export function degreeDays(
  weather: DayWeather,
  month: number,
  base: number,
  method: DegreeDayMethod,
): number {
  switch (method) {
    case 'plain':
      return Math.max(0, base - weather.t);
    case 'weighted':
      return Math.max(0, base - weather.t) * seasonWeight(month);
    case 'effective':
      return Math.max(0, base - (weather.t - weather.fh / 1.5)) * seasonWeight(month);
  }
}
