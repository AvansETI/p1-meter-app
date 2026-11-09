export const TIME_ZONE = 'Europe/Amsterdam';

/** Offset of `timeZone` from UTC at `date`, in milliseconds (e.g. +3_600_000 for CET). */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** The UTC instant of the most recent local midnight in `timeZone` (DST-aware). */
export function localMidnight(now: Date = new Date(), timeZone = TIME_ZONE): Date {
  const local = new Date(now.getTime() + zoneOffsetMs(now, timeZone));
  const midnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  // The offset at midnight can differ from now (DST change during the day).
  const guess = new Date(midnightAsUtc - zoneOffsetMs(new Date(midnightAsUtc), timeZone));
  return new Date(midnightAsUtc - zoneOffsetMs(guess, timeZone));
}
