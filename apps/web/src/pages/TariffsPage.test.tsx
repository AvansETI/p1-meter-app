import type { TariffPeriod, TariffsResponse } from '@p1/shared';
import { IonApp } from '@ionic/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { SessionProvider } from '../session/SessionProvider';
import { SettingsProvider } from '../settings/SettingsProvider';
import { DEFAULT_SETTINGS } from '../settings/storage';
import { emptyDraft, toDraft } from '../tariffs/draft';
import PeriodEditor from '../tariffs/PeriodEditor';
import { SIGNATURE, capabilities, sessionResponse } from '../test/fixtures';
import TariffsPage from './TariffsPage';

const period: TariffPeriod = {
  validFrom: '2026-01-01',
  electricity: { type: 'single', perKwh: 0.3 },
  export: { compensationPerKwh: 0.05, feePerKwh: 0 },
  gas: { type: 'fixed', perM3: 1.4 },
  fixed: { supplierPerMonth: 7, gridPerMonth: 40 },
  taxReductionPerYear: 600,
};

function setup(tariffs: TariffsResponse) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const json = (body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    const caps = { hasExport: true, hasGas: true };
    if (url.startsWith('/api/v1/session')) return json(sessionResponse(caps));
    if (url.startsWith('/api/v1/capabilities')) return json(capabilities(caps));
    if (url === '/api/v1/tariffs') return json(tariffs);
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SettingsProvider initial={{ ...DEFAULT_SETTINGS, emonId: SIGNATURE }}>
        <SessionProvider>
          <MemoryRouter initialEntries={['/settings/tariffs']}>
            <IonApp>
              <TariffsPage />
            </IonApp>
          </MemoryRouter>
        </SessionProvider>
      </SettingsProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TariffsPage', () => {
  it('invites to enter tariffs when there are none', async () => {
    setup({ profiles: { own: { periods: [] } }, version: 0, updatedAt: null });
    expect(await screen.findByText('Nog geen tarieven ingevuld.')).toBeTruthy();
    expect(screen.getAllByText('Vergelijkingscontract toevoegen').length).toBeGreaterThan(0);
    expect(screen.queryByText('Eerdere versies')).toBeNull();
  });

  it('lists periods of both profiles and offers the version history', async () => {
    setup({
      profiles: {
        own: { periods: [period] },
        compare: { name: 'Dynamisch ANWB', periods: [] },
      },
      version: 3,
      updatedAt: '2026-11-09T10:00:00Z',
    });
    expect(await screen.findByText('Vanaf 1 januari 2026')).toBeTruthy();
    expect(screen.getByText('Enkel tarief · € 0,30/kWh')).toBeTruthy();
    expect(screen.getByText('Vergelijken met: Dynamisch ANWB')).toBeTruthy();
    expect(screen.getByText('Eerdere versies')).toBeTruthy();
  });
});

describe('PeriodEditor', () => {
  const renderEditor = (initial = toDraft(period), takenDates: string[] = []) => {
    const onSave = vi.fn();
    render(
      <PeriodEditor
        initial={initial}
        hasExport
        hasGas
        takenDates={takenDates}
        onCancel={() => {}}
        onSave={onSave}
      />,
    );
    return onSave;
  };

  it('saves a valid period', () => {
    const onSave = renderEditor();
    fireEvent.click(screen.getByText('Opslaan'));
    expect(onSave).toHaveBeenCalledWith(period);
  });

  it('refuses incomplete periods and dates already in use', async () => {
    const onSave = renderEditor(emptyDraft('2026-01-01', true), ['2026-01-01']);
    fireEvent.click(screen.getByText('Opslaan'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows gas fields only for households with gas', () => {
    render(
      <PeriodEditor
        initial={emptyDraft('2026-01-01', false)}
        hasExport={false}
        hasGas={false}
        takenDates={[]}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.queryByText('Gas')).toBeNull();
    expect(screen.queryByText('Teruglevering')).toBeNull();
  });
});
