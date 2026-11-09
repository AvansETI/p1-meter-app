import { render } from '@testing-library/react';
import type { RecentSeries } from '@p1/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import RecentChart from './RecentChart';

const init = vi.hoisted(() => vi.fn());
vi.mock('echarts/core', async (importOriginal) => {
  const real = await importOriginal<typeof import('echarts/core')>();
  init.mockImplementation(real.init);
  return { ...real, init };
});

const series = (netKw: number): RecentSeries => ({
  stepSec: 300,
  points: [{ t: '2026-11-09T10:00:00Z', netKw }],
});

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  init.mockClear();
});

describe('RecentChart', () => {
  // Regression #19: re-creating the chart on every update left a 0×0 chart on iOS.
  it('creates the chart once and updates it with new data', () => {
    const { rerender, unmount } = render(<RecentChart series={series(1)} hasExport />);
    rerender(<RecentChart series={series(2)} hasExport />);
    rerender(<RecentChart series={series(-0.5)} hasExport />);
    expect(init).toHaveBeenCalledTimes(1);
    unmount();
  });
});
