import { IonApp } from '@ionic/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { SessionProvider } from '../session/SessionProvider';
import { SettingsProvider } from '../settings/SettingsProvider';
import { DEFAULT_SETTINGS, type Settings } from '../settings/storage';
import { SIGNATURE, capabilities, sessionResponse } from '../test/fixtures';
import SettingsPage from './SettingsPage';

afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await i18n.changeLanguage('nl');
});

function renderPage(settings: Partial<Settings> = {}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const body = url.startsWith('/api/v1/session') ? sessionResponse({}) : capabilities({});
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SettingsProvider initial={{ ...DEFAULT_SETTINGS, emonId: SIGNATURE, ...settings }}>
        <SessionProvider>
          <MemoryRouter>
            <IonApp>
              <SettingsPage />
            </IonApp>
          </MemoryRouter>
        </SessionProvider>
      </SettingsProvider>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  it('shows the language setting and follows a stored English choice', async () => {
    renderPage();
    expect(await screen.findByText('Taal')).toBeInTheDocument();
    cleanup();
    // Switch first: in jsdom, Ionic's labels keep the old text node next to the new one.
    await i18n.changeLanguage('en');
    renderPage({ language: 'en' });
    expect(await screen.findByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Last measurement')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('shows the meter information with each value under its label', async () => {
    const caps = { hasExport: true, hasGas: true };
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const body = url.startsWith('/api/v1/session') ? sessionResponse(caps) : capabilities(caps);
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SettingsProvider initial={{ ...DEFAULT_SETTINGS, emonId: SIGNATURE }}>
          <SessionProvider>
            <MemoryRouter>
              <IonApp>
                <SettingsPage />
              </IonApp>
            </MemoryRouter>
          </SessionProvider>
        </SettingsProvider>
      </QueryClientProvider>,
    );
    const measured = await screen.findByText('Stroomverbruik, Teruglevering, Gas');
    // Same label element as its title, not a separate note next to it (#46: iPhone layout).
    expect(measured.tagName).toBe('P');
    expect(measured.closest('ion-label')).toHaveTextContent('Gemeten');
  });
});
