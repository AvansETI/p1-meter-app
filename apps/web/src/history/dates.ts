import {
  formatPlainDate,
  isoWeek,
  parsePlainDate,
  periodStart,
  type Period,
  type PlainDate,
} from '@p1/shared';

export const TIME_ZONE = 'Europe/Amsterdam';

/** Today's date in the Netherlands, as the API uses it. */
export function today(now = new Date()): PlainDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parsePlainDate(parts) ?? { year: 1970, month: 1, day: 1 };
}

/** Calendar date (Netherlands) of an ISO instant. */
export function dateOfInstant(iso: string): PlainDate {
  return today(new Date(iso));
}

const dayFormat = new Intl.DateTimeFormat('nl-NL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthFormat = new Intl.DateTimeFormat('nl-NL', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const asUtc = (d: PlainDate) => new Date(Date.UTC(d.year, d.month - 1, d.day));

/** Heading for a period: "ma 9 nov 2026", "week 46, 2026", "november 2026", "2026". */
export function periodLabel(period: Period, date: PlainDate): string {
  const start = periodStart(date, period);
  switch (period) {
    case 'day':
      return dayFormat.format(asUtc(start)).replace(/\./g, '');
    case 'week': {
      const { year, week } = isoWeek(start);
      return `week ${week}, ${year}`;
    }
    case 'month':
      return monthFormat.format(asUtc(start));
    case 'year':
      return String(start.year);
  }
}

const hourLabel = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const shortMonth = new Intl.DateTimeFormat('nl-NL', { month: 'short', timeZone: TIME_ZONE });
const weekdayShort = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', timeZone: TIME_ZONE });
const dayNumber = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', timeZone: TIME_ZONE });
const longDay = new Intl.DateTimeFormat('nl-NL', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const monthYear = new Intl.DateTimeFormat('nl-NL', {
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});
const monthOnly = new Intl.DateTimeFormat('nl-NL', { month: 'long', timeZone: TIME_ZONE });
const yearOnly = new Intl.DateTimeFormat('nl-NL', { year: 'numeric', timeZone: TIME_ZONE });
const noDots = (value: string) => value.replace(/\./g, '');

const dayOfMonthLabel = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', timeZone: TIME_ZONE });
const monthLabel = new Intl.DateTimeFormat('nl-NL', { month: 'short', timeZone: TIME_ZONE });
const fullDateLabel = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

/** Axis label of a bucket: "14:00", "ma 9", "9", "jan". */
export function bucketLabel(period: Period, startIso: string): string {
  const date = new Date(startIso);
  switch (period) {
    case 'day':
      return hourLabel.format(date);
    case 'week':
      // Two lines so the month is readable: "ma" / "9 nov".
      return `${noDots(weekdayShort.format(date))}\n${dayNumber.format(date)} ${noDots(shortMonth.format(date))}`;
    case 'month':
      return dayOfMonthLabel.format(date);
    case 'year':
      return monthLabel.format(date).replace(/\./g, '');
  }
}

/** Tooltip title of a bucket: "14:00–15:00", "ma 9", "9 nov 2026", "nov". */
export function bucketTitle(period: Period, startIso: string, nextStartIso?: string): string {
  if (period === 'day') {
    const end = nextStartIso ?? new Date(Date.parse(startIso) + 3_600_000).toISOString();
    return `${hourLabel.format(new Date(startIso))}–${hourLabel.format(new Date(end))}`;
  }
  if (period === 'month') return fullDateLabel.format(new Date(startIso)).replace(/\./g, '');
  return bucketLabel(period, startIso);
}

export const toParam = formatPlainDate;

/**
 * Line under the x-axis that says which date, month or year the buckets belong to:
 * "ma 9 november 2026", "november 2026" (or "oktober – november 2026" for a week across two
 * months), "2026".
 */
export function axisTitle(period: Period, bucketStarts: string[]): string {
  const first = bucketStarts[0];
  if (!first) return '';
  const start = new Date(first);
  switch (period) {
    case 'day':
      return noDots(longDay.format(start));
    case 'month':
      return monthYear.format(start);
    case 'year':
      return yearOnly.format(start);
    case 'week': {
      const end = new Date(bucketStarts.at(-1) ?? first);
      if (monthYear.format(start) === monthYear.format(end)) return monthYear.format(start);
      return yearOnly.format(start) === yearOnly.format(end)
        ? `${monthOnly.format(start)} – ${monthYear.format(end)}`
        : `${monthYear.format(start)} – ${monthYear.format(end)}`;
    }
  }
}
