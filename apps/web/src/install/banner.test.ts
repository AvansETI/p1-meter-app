import { describe, expect, it } from 'vitest';
import { BANNER_SNOOZE_MS, shouldShowBanner } from './banner';

const now = Date.parse('2026-11-09T12:00:00Z');
const show = (overrides: Partial<Parameters<typeof shouldShowBanner>[0]>) =>
  shouldShowBanner({
    method: 'ios',
    liveStatus: 'live',
    dismissedAt: undefined,
    now,
    ...overrides,
  });

describe('shouldShowBanner', () => {
  it('shows for installable browsers', () => {
    for (const method of ['prompt', 'ios', 'macos-safari', 'firefox-android'] as const) {
      expect(show({ method })).toBe(true);
    }
  });

  it('hides when installed or unsupported', () => {
    expect(show({ method: 'installed' })).toBe(false);
    expect(show({ method: 'unsupported' })).toBe(false);
  });

  it('gives the offline notice priority', () => {
    expect(show({ liveStatus: 'offline' })).toBe(false);
    expect(show({ liveStatus: 'stale' })).toBe(true);
  });

  it('stays away for 30 days after dismissal', () => {
    expect(show({ dismissedAt: new Date(now - 1000).toISOString() })).toBe(false);
    expect(show({ dismissedAt: new Date(now - BANNER_SNOOZE_MS + 60_000).toISOString() })).toBe(
      false,
    );
    expect(show({ dismissedAt: new Date(now - BANNER_SNOOZE_MS - 1).toISOString() })).toBe(true);
  });
});
