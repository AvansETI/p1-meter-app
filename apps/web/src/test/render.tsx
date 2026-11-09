import { vi } from 'vitest';
import { IonApp } from '@ionic/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import '../i18n';
import { SessionProvider } from '../session/SessionProvider';
import { SettingsProvider } from '../settings/SettingsProvider';
import { DEFAULT_SETTINGS, type Settings } from '../settings/storage';

/** Renders inside the app's providers with the given (in-memory) settings. */
export function renderWithProviders(ui: ReactElement, settings: Partial<Settings> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsProvider initial={{ ...DEFAULT_SETTINGS, ...settings }}>
        <SessionProvider>
          <IonApp>{ui}</IonApp>
        </SessionProvider>
      </SettingsProvider>
    </QueryClientProvider>,
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

type Route = { status: number; body?: unknown };

/** Mocks `fetch` by URL path, e.g. { '/api/v1/session': { status: 200, body } }. */
export function mockApi(routes: Record<string, Route>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.split('?')[0]!;
    const route = routes[path];
    if (!route) return Promise.reject(new Error(`unexpected fetch ${path}`));
    return Promise.resolve(
      new Response(route.body === undefined ? null : JSON.stringify(route.body), {
        status: route.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
}
