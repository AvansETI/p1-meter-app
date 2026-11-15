import type { GasSharedSettings } from '@p1/shared';
import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSettings } from '../settings/context';
import { DEFAULT_GAS_SETTINGS, sharedGas, type Settings } from '../settings/storage';
import { SIGNATURE, sessionResponse } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { useGasSaveFailed, useGasSettingsSync } from './sync';

const OTHER = '2019-ETI-EMON-V01-FFFFFF-000000';
const server: GasSharedSettings = { ...sharedGas(DEFAULT_GAS_SETTINGS), method: 'plain' };

function Probe() {
  const { settings, setGas } = useSettings();
  useGasSettingsSync(settings.emonId, true);
  const failed = useGasSaveFailed();
  return (
    <>
      <pre data-testid="settings">{JSON.stringify(settings)}</pre>
      {failed && <p>failed</p>}
      <button onClick={() => setGas({ base: 16 })}>change</button>
    </>
  );
}

/** Mocks the API with the given server copy; PUT bodies are collected. */
function mock(stored: GasSharedSettings | null, putStatus = 200) {
  const puts: GasSharedSettings[] = [];
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const json = (status: number, body: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/session')) return json(200, sessionResponse());
    if (init?.method === 'PUT') {
      puts.push((JSON.parse(init.body as string) as { settings: GasSharedSettings }).settings);
      return putStatus === 200
        ? json(200, { updatedAt: '2026-11-15T12:00:00Z' })
        : json(putStatus, { error: 'upstream_unavailable' });
    }
    return json(200, { settings: stored, updatedAt: stored ? '2026-11-15T11:00:00Z' : null });
  });
  return { fetch, puts };
}

const shown = () => JSON.parse(screen.getByTestId('settings').textContent) as Settings;
const gets = (fetch: ReturnType<typeof mock>['fetch']) =>
  fetch.mock.calls.filter(([, init]) => init?.method !== 'PUT' && init?.method !== 'POST').length;

describe('gas settings sync', () => {
  it('uploads the local settings when the server has none yet', async () => {
    const { puts } = mock(null);
    renderWithProviders(<Probe />, {
      emonId: SIGNATURE,
      gas: { ...DEFAULT_GAS_SETTINGS, base: 17 },
    });
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toMatchObject({ base: 17 });
    await waitFor(() =>
      expect(shown()).toMatchObject({ gasSyncedFor: SIGNATURE, gasDirty: false }),
    );
  });

  it("adopts the server's settings and keeps on/off of this device", async () => {
    const { puts } = mock(server);
    renderWithProviders(<Probe />, {
      emonId: SIGNATURE,
      gasSyncedFor: SIGNATURE,
      gas: { ...DEFAULT_GAS_SETTINGS, enabled: false },
    });
    await waitFor(() => expect(shown().gas.method).toBe('plain'));
    expect(shown().gas.enabled).toBe(false);
    expect(puts).toHaveLength(0);
  });

  it('sends an unsent local change instead of adopting (last write wins)', async () => {
    const { puts } = mock(server);
    renderWithProviders(<Probe />, {
      emonId: SIGNATURE,
      gasSyncedFor: SIGNATURE,
      gasDirty: true,
      gas: { ...DEFAULT_GAS_SETTINGS, base: 15 },
    });
    await waitFor(() => expect(puts.at(-1)).toMatchObject({ base: 15, method: 'weighted' }));
    expect(shown().gas.method).toBe('weighted');
  });

  it("never copies another household's settings", async () => {
    const { puts } = mock(null);
    renderWithProviders(<Probe />, {
      emonId: SIGNATURE,
      gasSyncedFor: OTHER,
      gas: { ...DEFAULT_GAS_SETTINGS, base: 15, postcode: '35' },
    });
    await waitFor(() => expect(shown().gasSyncedFor).toBe(SIGNATURE));
    expect(shown().gas).toEqual(DEFAULT_GAS_SETTINGS);
    expect(puts).toHaveLength(0);
  });

  it('sends a change after a pause and keeps it when saving fails', async () => {
    const { puts } = mock(server, 503);
    renderWithProviders(<Probe />, { emonId: SIGNATURE, gasSyncedFor: SIGNATURE });
    await waitFor(() => expect(shown().gas.method).toBe('plain'));
    act(() => screen.getByText('change').click());
    await waitFor(() => expect(puts).toHaveLength(1), { timeout: 3000 });
    expect(puts[0]).toMatchObject({ base: 16, method: 'plain' });
    expect(await screen.findByText('failed')).toBeTruthy();
    expect(shown().gasDirty).toBe(true);
  });

  it('reads the settings again when the app returns to the foreground', async () => {
    const { fetch } = mock(server);
    renderWithProviders(<Probe />, { emonId: SIGNATURE, gasSyncedFor: SIGNATURE });
    await waitFor(() => expect(gets(fetch)).toBe(1));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(gets(fetch)).toBe(2));
  });
});
