import type { History } from '@p1/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IonApp } from '@ionic/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { SessionProvider } from '../session/SessionProvider';
import { SettingsProvider } from '../settings/SettingsProvider';
import { DEFAULT_SETTINGS } from '../settings/storage';
import { SIGNATURE, capabilities, sessionResponse } from '../test/fixtures';
import HistoryPage from './HistoryPage';

vi.mock('../history/HistoryCharts', () => ({
  EnergyChart: () => <div data-testid="energy-chart" />,
  GasHistoryChart: () => <div data-testid="gas-chart" />,
}));

const history = (period: History['period'], start: string): History => ({
  period,
  start,
  end: start,
  firstData: '2026-11-02',
  buckets: [],
  totals: { importKwh: 88, exportKwh: 12, netKwh: 76, gasM3: 9, complete: true },
  previous: { importKwh: 100, exportKwh: 10, netKwh: 90, gasM3: 9.1, complete: true },
});

function setup(url: string, caps: { hasExport: boolean; hasGas: boolean }) {
  const requests: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requests.push(url);
    const json = (body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    if (url.startsWith('/api/v1/session')) return json(sessionResponse(caps));
    if (url.startsWith('/api/v1/capabilities')) return json(capabilities(caps));
    if (url.startsWith('/api/v1/history')) {
      const params = new URL(url, 'http://x').searchParams;
      return json(
        history(params.get('period') as History['period'], `${params.get('date')}T00:00:00Z`),
      );
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SettingsProvider initial={{ ...DEFAULT_SETTINGS, emonId: SIGNATURE }}>
        <SessionProvider>
          <MemoryRouter initialEntries={[url]}>
            <IonApp>
              <HistoryPage />
            </IonApp>
          </MemoryRouter>
        </SessionProvider>
      </SettingsProvider>
    </QueryClientProvider>,
  );
  return requests;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HistoryPage', () => {
  it('reads period and date from the URL and requests the period start', async () => {
    const requests = setup('/history?period=week&date=2026-11-11', {
      hasExport: true,
      hasGas: true,
    });
    expect(await screen.findByText('week 46, 2026')).toBeInTheDocument();
    expect(screen.getByAltText('MNEXT')).toBeInTheDocument(); // title bar logo (#43)
    await waitFor(() => expect(requests).toContain('/api/v1/history?period=week&date=2026-11-09'));
  });

  it('shows totals with the comparison to the previous period', async () => {
    setup('/history?period=week&date=2026-11-11', { hasExport: true, hasGas: true });
    expect(await screen.findByText('▼ 12 % t.o.v. vorige week')).toHaveClass(
      'history-change--good',
    );
    expect(screen.getByText('▲ 20 % t.o.v. vorige week')).toHaveClass('history-change--good'); // export
    expect(screen.getByText('▼ 1 % t.o.v. vorige week')).toHaveClass('history-change--neutral'); // gas
  });

  it('navigates to the previous period and stops at the first data', async () => {
    setup('/history?period=week&date=2026-11-11', { hasExport: true, hasGas: true });
    await screen.findByText('week 46, 2026');
    // Wait until the first period is loaded, so firstData is known before navigating.
    await screen.findByText('▼ 12 % t.o.v. vorige week', {}, { timeout: 5000 });
    fireEvent.click(screen.getByLabelText('Vorige periode'));
    expect(await screen.findByText('week 45, 2026', {}, { timeout: 5000 })).toBeInTheDocument();
    // firstData is 2026-11-02, the first day of week 45.
    await waitFor(() =>
      expect(screen.getByLabelText('Vorige periode')).toHaveAttribute('disabled'),
    );
  });

  it('hides export, net and gas for households without them', async () => {
    setup('/history?period=day&date=2026-11-09', { hasExport: false, hasGas: false });
    expect(await screen.findByText('Afname')).toBeInTheDocument();
    expect(screen.queryByText('Netto')).toBeNull();
    expect(screen.queryByTestId('gas-chart')).toBeNull();
  });
});
