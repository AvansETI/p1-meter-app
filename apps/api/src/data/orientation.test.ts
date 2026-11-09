import { describe, expect, it } from 'vitest';
import { decideOrientation, type DayStats } from './orientation';

const EXPECTED = 4320;
const day = (importKwh: number, deltaConsumed: number, deltaProduced: number): DayStats => ({
  points: EXPECTED,
  importKwh,
  deltaConsumed,
  deltaProduced,
});
const decide = (days: DayStats[]) => decideOrientation(days);

describe('decideOrientation', () => {
  it('detects counters as named', () => {
    expect(decide([day(30, 30.4, 5), day(20, 19.8, 2), day(25, 25.1, 0)])).toEqual({
      counterOrientation: 'as-named',
      importCounter: 'energy_consumed',
    });
  });

  it('detects swapped counters', () => {
    expect(decide([day(30.2, 5.4, 30.4), day(19.5, 6.2, 19.7), day(48.9, 0.2, 48.8)])).toEqual({
      counterOrientation: 'swapped',
      importCounter: 'energy_produced',
    });
  });

  it('is unknown with fewer than three valid days', () => {
    expect(decide([day(30, 5, 30), day(20, 2, 20)]).counterOrientation).toBe('unknown');
  });

  it('is unknown when the days disagree', () => {
    const days = [day(30, 30, 5), day(30, 30, 5), day(30, 5, 30), day(30, 5, 30)];
    expect(decide(days)).toEqual({
      counterOrientation: 'unknown',
      importCounter: 'energy_consumed',
    });
  });

  it("judges completeness against the household's own typical day", () => {
    // A kit sending every ~33 s: about 2600 points per day is complete for this household.
    const sparse = (d: DayStats): DayStats => ({ ...d, points: 2620 });
    const days = [
      sparse(day(51, 11, 51)),
      sparse(day(23.2, 22.1, 23.2)),
      sparse(day(42.6, 7.1, 42.8)),
    ];
    expect(decide([...days, { ...day(27.5, 4.7, 27.6), points: 1119 }]).counterOrientation).toBe(
      'swapped',
    );
  });

  it('ignores incomplete days, low usage and missing counters', () => {
    const swapped = [day(30, 5, 30), day(30, 5, 30), day(30, 5, 30), day(30, 5, 30)];
    const noise: DayStats[] = [
      { ...day(30, 30, 5), points: 1000 },
      day(0.5, 0.5, 0),
      { ...day(30, 30, 5), deltaProduced: null },
      { ...day(30, 30, 5), importKwh: null },
    ];
    expect(decide([...swapped, ...noise]).counterOrientation).toBe('swapped');
  });
});
