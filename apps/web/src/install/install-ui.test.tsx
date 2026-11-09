import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LivePage from '../pages/LivePage';
import SettingsPage from '../pages/SettingsPage';
import { installFakeEventSource } from '../test/eventsource';
import { SIGNATURE, capabilities, sessionResponse } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/render';
import { resetInstallPrompt } from './prompt';

vi.mock('../live/RecentChart', () => ({ default: () => null }));

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const WINDOWS_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';

const useAgent = (ua: string) => vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);

beforeEach(() => {
  installFakeEventSource();
  mockApi({
    '/api/v1/session': { status: 200, body: sessionResponse() },
    '/api/v1/capabilities': { status: 200, body: capabilities() },
    '/api/v1/live/today': { status: 200, body: { since: '2026-11-08T23:00:00Z', importKwh: 1 } },
    '/api/v1/live/recent': { status: 200, body: { stepSec: 300, points: [] } },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetInstallPrompt();
});

describe('Settings → App', () => {
  it('offers installing on an iPhone', async () => {
    useAgent(IPHONE);
    renderWithProviders(<SettingsPage />, { emonId: SIGNATURE });
    expect(await screen.findByText('App installeren')).toBeInTheDocument();
  });

  it('explains where installing works on unsupported browsers', async () => {
    useAgent(WINDOWS_FIREFOX);
    renderWithProviders(<SettingsPage />, { emonId: SIGNATURE });
    expect(await screen.findByText(/kan in Chrome, Edge of Safari/)).toBeInTheDocument();
    expect(screen.queryByText('App installeren')).toBeNull();
  });

  it('hides the section when the app is installed', async () => {
    useAgent(IPHONE);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderWithProviders(<SettingsPage />, { emonId: SIGNATURE });
    await screen.findByText('Over');
    expect(screen.queryByText('App installeren')).toBeNull();
    expect(screen.queryByText(/kan in Chrome/)).toBeNull();
  });
});

describe('Live install banner', () => {
  it('shows on an iPhone and can be dismissed for 30 days', async () => {
    useAgent(IPHONE);
    renderWithProviders(<LivePage />, { emonId: SIGNATURE });
    expect(await screen.findByText(/op je beginscherm/)).toBeInTheDocument();
    expect(screen.getByText('Hoe?')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Niet nu'));
    await waitFor(() => expect(screen.queryByText(/op je beginscherm/)).toBeNull());
    const stored = JSON.parse(localStorage.getItem('p1meter.settings') ?? '{}') as {
      installHintDismissedAt?: string;
    };
    expect(stored.installHintDismissedAt).toBeDefined();
  });

  it('stays away on unsupported browsers', async () => {
    useAgent(WINDOWS_FIREFOX);
    renderWithProviders(<LivePage />, { emonId: SIGNATURE });
    await screen.findByText('Vandaag');
    expect(screen.queryByText(/op je beginscherm/)).toBeNull();
  });
});
