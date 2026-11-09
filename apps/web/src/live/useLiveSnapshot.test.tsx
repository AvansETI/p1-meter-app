import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeEventSource, installFakeEventSource } from '../test/eventsource';
import { api } from '../api/client';
import { capabilities, sessionResponse } from '../test/fixtures';
import { mockApi } from '../test/render';
import { useLiveSnapshot } from './useLiveSnapshot';

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  installFakeEventSource();
  mockApi({
    '/api/v1/session': { status: 200, body: sessionResponse() },
    '/api/v1/capabilities': { status: 200, body: capabilities() },
    '/api/v1/live': {
      status: 200,
      body: {
        time: '2026-11-09T12:00:00Z',
        ageSec: 1,
        status: 'live',
        importKw: 1,
        exportKw: 0,
        netKw: 1,
      },
    },
  });
  await api.openSession('A1B2C3-000000');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useLiveSnapshot', () => {
  it('ages the last value: live → stale → offline without new events', async () => {
    const { result } = renderHook(() => useLiveSnapshot(true));
    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    act(() =>
      FakeEventSource.instances[0]!.emit('live', {
        time: '2026-11-09T12:00:00Z',
        ageSec: 290,
        status: 'live',
        importKw: 1,
        exportKw: 0,
        netKw: 1,
      }),
    );
    expect(result.current.status).toBe('live');
    await act(() => vi.advanceTimersByTimeAsync(11_000));
    expect(result.current.status).toBe('stale');
    await act(() => vi.advanceTimersByTimeAsync(3_600_000));
    expect(result.current.status).toBe('offline');
  });

  it('falls back to polling after repeated stream failures', async () => {
    const { result } = renderHook(() => useLiveSnapshot(true));
    for (let attempt = 1; attempt <= 3; attempt++) {
      await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(attempt));
      act(() => FakeEventSource.instances[attempt - 1]!.fail());
      if (attempt < 3) await act(() => vi.advanceTimersByTimeAsync(5_000));
    }
    await vi.waitFor(() => expect(result.current.snapshot?.netKw).toBe(1));
  });

  it('does nothing while disabled', () => {
    renderHook(() => useLiveSnapshot(false));
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
