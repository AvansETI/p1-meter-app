import { describe, expect, it } from 'vitest';
import { localMidnight } from './time';

describe('localMidnight (Europe/Amsterdam)', () => {
  it.each([
    // winter time (UTC+1)
    ['2026-11-09T12:00:00Z', '2026-11-08T23:00:00.000Z'],
    // summer time (UTC+2)
    ['2026-07-15T12:00:00Z', '2026-07-14T22:00:00.000Z'],
    // just after local midnight, still the previous UTC day
    ['2026-11-08T23:30:00Z', '2026-11-08T23:00:00.000Z'],
    // just before local midnight
    ['2026-11-08T22:59:59Z', '2026-11-07T23:00:00.000Z'],
    // DST starts 29 Mar 2026 02:00 → 03:00; midnight was still UTC+1
    ['2026-03-29T12:00:00Z', '2026-03-28T23:00:00.000Z'],
    // DST ends 25 Oct 2026 03:00 → 02:00; midnight was still UTC+2
    ['2026-10-25T12:00:00Z', '2026-10-24T22:00:00.000Z'],
  ])('%s → %s', (now, expected) => {
    expect(localMidnight(new Date(now)).toISOString()).toBe(expected);
  });
});
