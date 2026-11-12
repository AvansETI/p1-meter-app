import { parsePlainDate, type PlainDate } from '@p1/shared';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { axisTitle, bucketLabel, bucketTitle, periodLabel, today } from './dates';

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
    expect(bucketLabel('week', '2026-11-08T23:00:00.000Z')).toBe('ma\n9 nov');
    expect(bucketLabel('year', '2026-02-28T23:00:00.000Z')).toBe('mrt');
    expect(bucketTitle('day', '2026-11-09T13:00:00.000Z')).toBe('14:00–15:00');
  });

  it('names the date, month or year under the x-axis', () => {
    expect(axisTitle('day', ['2026-11-08T23:00:00.000Z'])).toBe('ma 9 november 2026');
    expect(axisTitle('month', ['2026-10-31T23:00:00.000Z'])).toBe('november 2026');
    expect(axisTitle('year', ['2025-12-31T23:00:00.000Z'])).toBe('2026');
    expect(axisTitle('week', ['2026-11-08T23:00:00.000Z', '2026-11-14T23:00:00.000Z'])).toBe(
      'november 2026',
    );
    expect(axisTitle('week', ['2026-10-25T23:00:00.000Z', '2026-10-31T23:00:00.000Z'])).toBe(
      'oktober – november 2026',
    );
    expect(axisTitle('week', ['2026-12-27T23:00:00.000Z', '2027-01-02T23:00:00.000Z'])).toBe(
      'december 2026 – januari 2027',
    );
  });

  it("uses the Netherlands' date for today", () => {
    expect(today(new Date('2026-11-09T23:30:00Z'))).toEqual({ year: 2026, month: 11, day: 10 });
  });

  describe('in English', () => {
    afterEach(() => i18n.changeLanguage('nl'));

    it('uses English names with the day before the month', async () => {
      await i18n.changeLanguage('en');
      expect(periodLabel('day', d('2026-11-09'))).toBe('Mon, 9 Nov 2026');
      expect(periodLabel('week', d('2026-11-11'))).toBe('week 46, 2026');
      expect(periodLabel('month', d('2026-11-30'))).toBe('November 2026');
      expect(bucketLabel('day', '2026-11-09T13:00:00.000Z')).toBe('14:00');
      expect(bucketLabel('week', '2026-11-08T23:00:00.000Z')).toBe('Mon\n9 Nov');
      expect(axisTitle('day', ['2026-11-08T23:00:00.000Z'])).toBe('Mon, 9 November 2026');
    });
  });
});
