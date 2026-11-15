import type { GasAnalysis, GasComparison, GasHourly } from '@p1/shared';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { navItems } from '../navigation';
import { DEFAULT_GAS_SETTINGS } from '../settings/storage';
import { SIGNATURE, sessionResponse } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/render';
import GasPage from './GasPage';
import GasSettingsPage from './GasSettingsPage';

vi.mock('../gas/GasCharts', () => ({
  PerDegreeDayChart: () => <div data-testid="per-dd-chart" />,
  HeatingLineChart: () => <div data-testid="line-chart" />,
  TemperatureCurveChart: () => <div data-testid="curve-chart" />,
  DayProfileChart: () => <div data-testid="profile-chart" />,
}));

const period = { start: '2026-01-01', key: '2026-01', days: 31, m3: 120, dd: 400, perDd: 0.28 };
const analysis = (pending = false): GasAnalysis => ({
  station: 260,
  pending,
  weatherUntil: '2026-11-13',
  days: [{ day: '2026-01-01', m3: 4, t: 3, dd: 16.5 }],
  baseline: { value: 0.4, auto: 0.4, source: 'auto' },
  line: { slope: 0.28, intercept: 0.4, r2: 0.91, n: 180 },
  periods: { week: [], month: [period], year: [{ ...period, key: '2026' }] },
  years: [
    { year: 2024, days: 366, m3: 1100, dd: 2600, corrected: 1050, complete: true, baseline: 0.5 },
    { year: 2025, days: 365, m3: 980, dd: 2500, corrected: 945, complete: true, baseline: 0.4 },
  ],
  forecast: { year: 2026, actual: 700, estimated: 250, total: 950 },
  normal: { annual: 2700, years: 20 },
  degreeDays: { year: 2026, actual: 1397, normal: 1520 },
  rolling: { corrected: 900, days: 365, previous: 1000 },
});
const hourly: GasHourly = {
  pending: false,
  from: '2026-08-17',
  to: '2026-11-15',
  hourlyUpdates: true,
  curve: [{ t: 5, m3: 0.2, n: 40 }],
  profiles: { cold: null, mild: Array.from({ length: 24 }, () => 0.1) },
};
const comparison: GasComparison = {
  own: 945,
  shared: false,
  all: { n: 40, percentile: 30, p10: 600, p25: 800, p50: 1000, p75: 1200, p90: 1500 },
  group: null,
  cbs: {
    year: 2025,
    profile: { type: 'terraced' },
    perDwelling: {
      mean: 940,
      p10: 460,
      p20: 600,
      p30: 700,
      p40: 800,
      p50: 910,
      p60: 1000,
      p70: 1100,
      p80: 1250,
      p90: 1460,
    },
    perM2: null,
    medians: [{ year: 2025, p50: 910 }],
  },
};

function setup(page: 'gas' | 'settings', pending = false, gas = DEFAULT_GAS_SETTINGS) {
  const fetch = mockApi({
    '/api/v1/session': { status: 200, body: sessionResponse({ hasGas: true }) },
    '/api/v1/gas/analysis': { status: 200, body: analysis(pending) },
    '/api/v1/gas/hourly': { status: 200, body: hourly },
    '/api/v1/gas/comparison': { status: 200, body: comparison },
    '/api/v1/gas/profile': { status: 204 },
  });
  renderWithProviders(
    <MemoryRouter>{page === 'gas' ? <GasPage /> : <GasSettingsPage />}</MemoryRouter>,
    { emonId: SIGNATURE, language: 'nl', gas },
  );
  return fetch;
}

const urls = (fetch: ReturnType<typeof setup>) =>
  fetch.mock.calls.map(([input]) =>
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
  );

afterEach(() => vi.restoreAllMocks());

describe('GasPage', () => {
  it('shows the summary, charts, years and comparison', async () => {
    const fetch = setup('gas');
    expect(await screen.findByText('Prognose 2026')).toBeTruthy();
    expect(screen.getByText('950')).toBeTruthy();
    expect(screen.getByText('Afgelopen 12 mnd, gecorrigeerd')).toBeTruthy();
    expect(screen.getByText('−10% t.o.v. 12 mnd ervoor')).toBeTruthy();
    expect(screen.getByText('Graaddagen 2026')).toBeTruthy();
    expect(screen.getByText('normaal 1.520 (−8%)')).toBeTruthy();
    expect(await screen.findByTestId('per-dd-chart')).toBeTruthy();
    // Only the first lazy chart is checked: jsdom resolves the others late.
    expect(screen.getByText('Verbruik over de dag')).toBeTruthy();
    expect(await screen.findByText(/minder dan 70% van deze 40 huishoudens/)).toBeTruthy();
    expect(screen.getByText('CBS-cijfers 2025')).toBeTruthy();
    expect(screen.getByText('Tussenwoning')).toBeTruthy();
    expect(screen.getByText(/één keer per uur/)).toBeTruthy();
    // Without a location De Bilt is used and the page offers to set one.
    expect(screen.getByText(/Weerstation De Bilt/)).toBeTruthy();
    expect(screen.getByText('Locatie instellen')).toBeTruthy();
    expect(
      urls(fetch).some((u) => u.includes('station=260') && u.includes('method=weighted')),
    ).toBe(true);
  });

  it('asks for the nearest station and waits while its weather is fetched', async () => {
    const fetch = setup('gas', true, { ...DEFAULT_GAS_SETTINGS, postcode: '62' });
    expect(await screen.findByText(/station Maastricht worden opgehaald/)).toBeTruthy();
    expect(screen.queryByText('Prognose 2026')).toBeNull();
    expect(urls(fetch).some((u) => u.includes('/gas/analysis?station=380'))).toBe(true);
  });
});

describe('GasSettingsPage', () => {
  it('uses the station nearest to the postcode and sends the region along', async () => {
    const fetch = setup('settings', false, { ...DEFAULT_GAS_SETTINGS, postcode: '97' });
    expect(await screen.findByText('In gebruik: Eelde.')).toBeTruthy();
    await waitFor(() =>
      expect(urls(fetch).some((u) => u.includes('station=280') && u.includes('postcode=97'))).toBe(
        true,
      ),
    );
  });

  it('tells which station is used without a location', async () => {
    setup('settings');
    expect(await screen.findByText('Nog geen locatie: De Bilt wordt gebruikt.')).toBeTruthy();
    expect(screen.getByText('Woningprofiel anoniem delen')).toBeTruthy();
  });
});

describe('profile sharing', () => {
  it('sends the profile with PUT and withdraws it with DELETE', async () => {
    const fetch = mockApi({ '/api/v1/gas/profile': { status: 204 } });
    expect((await api.shareGasProfile({ type: 'detached', solar: true })).ok).toBe(true);
    expect((await api.unshareGasProfile()).ok).toBe(true);
    const [put, del] = fetch.mock.calls;
    expect(put?.[1]).toMatchObject({ method: 'PUT', body: '{"type":"detached","solar":true}' });
    expect(del?.[1]).toMatchObject({ method: 'DELETE' });
  });
});

describe('navigation', () => {
  it('shows the Gas tab only for households with gas', () => {
    expect(navItems(true).map((i) => i.tab)).toEqual(['live', 'history', 'gas', 'settings']);
    expect(navItems(false).map((i) => i.tab)).toEqual(['live', 'history', 'settings']);
  });
});
