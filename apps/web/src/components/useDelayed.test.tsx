import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDelayed } from './useDelayed';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useDelayed', () => {
  it('turns on only after the delay and off as soon as the work is done', async () => {
    const { result, rerender } = renderHook(({ active }) => useDelayed(active, 500), {
      initialProps: { active: true },
    });
    expect(result.current).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(result.current).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
  });

  it('shows nothing for quick updates', async () => {
    const { result, rerender } = renderHook(({ active }) => useDelayed(active, 500), {
      initialProps: { active: true },
    });
    await act(() => vi.advanceTimersByTimeAsync(200));
    rerender({ active: false });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current).toBe(false);
  });
});
