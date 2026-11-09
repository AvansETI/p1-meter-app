import { describe, expect, it } from 'vitest';
import { liveStatus, netKw } from './live';

describe('liveStatus', () => {
  it.each([
    [0, 'live'],
    [299.9, 'live'],
    [300, 'stale'],
    [3599, 'stale'],
    [3600, 'offline'],
  ] as const)('%s s → %s', (age, status) => {
    expect(liveStatus(age)).toBe(status);
  });
});

describe('netKw', () => {
  it('subtracts export from import, also when both are positive (three phases)', () => {
    expect(netKw(3.52, 0)).toBe(3.52);
    expect(netKw(0, 1.2)).toBe(-1.2);
    expect(netKw(0.31, 0.12)).toBe(0.19);
  });
});
