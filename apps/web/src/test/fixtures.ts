import type { Capabilities, SessionResponse } from '@p1/shared';

export const SIGNATURE = '2019-ETI-EMON-V01-A1B2C3-000000';

export const capabilities = (overrides: Partial<Capabilities> = {}): Capabilities => ({
  hasGas: true,
  hasExport: true,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-09T10:00:00Z',
  ...overrides,
});

export const sessionResponse = (overrides: Partial<Capabilities> = {}): SessionResponse => ({
  sessionId: 'test-session',
  signature: SIGNATURE,
  capabilities: capabilities(overrides),
});
