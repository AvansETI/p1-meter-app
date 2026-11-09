import { parsePlainDate, type PlainDate } from '@p1/shared';
import { describe, expect, it } from 'vitest';
import { bucketLabel, bucketTitle, periodLabel, today } from './dates';

const d = (value: string) => parsePlainDate(value) as PlainDate;

describe('history dates', () => {
  it('labels periods in Dutch', () => {
    expect(periodLabel('day', d('2026-11-09'))).toBe('ma 9 nov 2026');
    expect(periodLabel('week', d('2026-11-11'))).toBe('week 46, 2026');
    expect(periodLabel('month', d('2026-11-30'))).toBe('november 2026');
    expect(periodLabel('year', d('2026-11-09'))).toBe('2026');
  });

  it('labels buckets in Dutch local time', () => {
    expect(bucketLabel('day', '2026-11-09T13:00:00.000Z')).toBe('14:00');
    expect(bucketLabel('week', '2026-11-08T23:00:00.000Z')).toBe('ma 9');
    expect(bucketLabel('year', '2026-02-28T23:00:00.000Z')).toBe('mrt');
    expect(bucketTitle('day', '2026-11-09T13:00:00.000Z')).toBe('14:00–15:00');
  });

  it("uses the Netherlands' date for today", () => {
    expect(today(new Date('2026-11-09T23:30:00Z'))).toEqual({ year: 2026, month: 11, day: 10 });
  });
});
