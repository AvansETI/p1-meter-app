import { describe, expect, it } from 'vitest';
import { API_BASE, isHealthResponse } from './api';

describe('API_BASE', () => {
  it('is versioned', () => {
    expect(API_BASE).toBe('/api/v1');
  });
});

describe('isHealthResponse', () => {
  it('accepts a valid health response', () => {
    expect(isHealthResponse({ status: 'ok', version: '0.0.0', uptimeSec: 3 })).toBe(true);
  });

  it.each([null, 'ok', {}, { status: 'down', version: '1', uptimeSec: 1 }, { status: 'ok' }])(
    'rejects %j',
    (value) => {
      expect(isHealthResponse(value)).toBe(false);
    },
  );
});
