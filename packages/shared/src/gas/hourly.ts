/** Hourly gas against the outdoor temperature (docs/design/2026-11-15-gas-analysis.md §3.6). */

/** Gas of one local hour with the temperature of that hour and the mean of its day. */
export interface GasHourSample {
  /** Local hour of the day, 0–23. */
  hour: number;
  m3: number;
  t: number;
  dayT: number | null;
}

export interface TemperatureBin {
  /** Bin centre, whole °C. */
  t: number;
  /** Mean gas per hour. */
  m3: number;
  n: number;
}

const MIN_BIN_HOURS = 5;
const MIN_PROFILE_HOURS = 3;
/** Day classes for the profile: cold below 5 °C, mild from 5 to 12 °C. */
export const COLD_BELOW = 5;
export const MILD_BELOW = 12;

/** Mean gas per hour per whole degree; bins with fewer than 5 hours are left out. */
export function temperatureCurve(samples: GasHourSample[]): TemperatureBin[] {
  const bins = new Map<number, { sum: number; n: number }>();
  for (const s of samples) {
    const t = Math.round(s.t);
    const bin = bins.get(t) ?? { sum: 0, n: 0 };
    bin.sum += s.m3;
    bin.n++;
    bins.set(t, bin);
  }
  return [...bins]
    .filter(([, b]) => b.n >= MIN_BIN_HOURS)
    .sort(([a], [b]) => a - b)
    .map(([t, b]) => ({ t, m3: b.sum / b.n, n: b.n }));
}

/** Mean gas per hour of the day for days in the class; null when no such day exists. */
export function dayProfile(
  samples: GasHourSample[],
  kind: 'cold' | 'mild',
): Array<number | null> | null {
  const inClass = samples.filter(
    (s) =>
      s.dayT !== null &&
      (kind === 'cold' ? s.dayT < COLD_BELOW : s.dayT >= COLD_BELOW && s.dayT < MILD_BELOW),
  );
  if (inClass.length === 0) return null;
  const sums = Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }));
  for (const s of inClass) {
    sums[s.hour]!.sum += s.m3;
    sums[s.hour]!.n++;
  }
  return sums.map((h) => (h.n >= MIN_PROFILE_HOURS ? h.sum / h.n : null));
}
