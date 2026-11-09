import { vi } from 'vitest';
import { IonApp } from '@ionic/react';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import '../i18n';
import { SessionProvider } from '../session/SessionProvider';
import { SettingsProvider } from '../settings/SettingsProvider';
import { DEFAULT_SETTINGS, type Settings } from '../settings/storage';

/** Renders inside the app's providers with the given (in-memory) settings. */
export function renderWithProviders(ui: ReactElement, settings: Partial<Settings> = {}) {
  return render(
    <SettingsProvider initial={{ ...DEFAULT_SETTINGS, ...settings }}>
      <SessionProvider>
        <IonApp>{ui}</IonApp>
      </SessionProvider>
    </SettingsProvider>,
  );
}

/** Mocks `fetch` with one JSON response per call, in order. */
export function mockFetch(...responses: Array<{ status: number; body?: unknown } | Error>) {
  const queue = [...responses];
  return vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    const next = queue.shift();
    if (!next) return Promise.reject(new Error('unexpected fetch'));
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(
      new Response(next.body === undefined ? null : JSON.stringify(next.body), {
        status: next.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
}
