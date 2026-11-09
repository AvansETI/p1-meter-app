import { describe, expect, it } from 'vitest';
import {
  bucketDates,
  formatPlainDate,
  isoWeek,
  parsePlainDate,
  periodStart,
  shiftPeriod,
  type PlainDate,
} from './calendar';

const d = (value: string) => parsePlainDate(value) as PlainDate;
const f = formatPlainDate;

describe('calendar', () => {
  it('parses only valid dates', () => {
    expect(parsePlainDate('2026-02-29')).toBeNull();
    expect(parsePlainDate('2026-13-01')).toBeNull();
    expect(parsePlainDate('09-11-2026')).toBeNull();
    expect(parsePlainDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it.each([
    ['day', '2026-11-09', '2026-11-09'],
    ['week', '2026-11-11', '2026-11-09'],
    ['week', '2026-11-08', '2026-11-02'],
    ['month', '2026-11-30', '2026-11-01'],
    ['year', '2026-11-09', '2026-01-01'],
  ] as const)('%s start of %s is %s', (period, date, start) => {
    expect(f(periodStart(d(date), period))).toBe(start);
  });

  it.each([
    ['day', '2026-12-31', 1, '2027-01-01'],
    ['week', '2026-11-09', -1, '2026-11-02'],
    ['month', '2026-01-31', 1, '2026-02-01'],
    ['month', '2026-01-15', -1, '2025-12-01'],
    ['year', '2026-06-01', -1, '2025-01-01'],
  ] as const)('shift %s from %s by %i → %s', (period, date, steps, result) => {
    expect(f(shiftPeriod(d(date), period, steps))).toBe(result);
  });

  it('lists the buckets of a period', () => {
    expect(bucketDates(d('2026-02-10'), 'month')).toHaveLength(28);
    expect(bucketDates(d('2024-02-10'), 'month')).toHaveLength(29);
    expect(bucketDates(d('2026-11-11'), 'week').map(f)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(bucketDates(d('2026-11-11'), 'year')).toHaveLength(12);
  });

  it('computes ISO weeks', () => {
    expect(isoWeek(d('2026-11-09'))).toEqual({ year: 2026, week: 46 });
    expect(isoWeek(d('2027-01-01'))).toEqual({ year: 2026, week: 53 });
    expect(isoWeek(d('2024-12-30'))).toEqual({ year: 2025, week: 1 });
  });
});
