import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { mockFetch, renderWithProviders } from '../test/render';
import UsageStats from './UsageStats';

afterEach(async () => {
  vi.restoreAllMocks();
  await i18n.changeLanguage('nl');
});

describe('UsageStats', () => {
  it('shows active users and meter kits', async () => {
    mockFetch({ status: 200, body: { days: 30, activeUsers: 23, activeInstallations: 41 } });
    renderWithProviders(<UsageStats />);
    expect(
      await screen.findByText('23 actieve gebruikers · 41 actieve meterkits (laatste 30 dagen)'),
    ).toBeInTheDocument();
  });

  it('says since when while counting is younger than the period, in singular', async () => {
    mockFetch({
      status: 200,
      body: { days: 30, activeUsers: 1, activeInstallations: 1, usersSince: '2026-11-15' },
    });
    renderWithProviders(<UsageStats />);
    expect(
      await screen.findByText(
        '1 actieve gebruiker sinds 15 nov 2026 · 1 actieve meterkit (laatste 30 dagen)',
      ),
    ).toBeInTheDocument();
  });

  it('shows only the users without a kit count, in English', async () => {
    await i18n.changeLanguage('en');
    mockFetch({ status: 200, body: { days: 30, activeUsers: 5 } });
    renderWithProviders(<UsageStats />, { language: 'en' });
    expect(await screen.findByText('5 active users (last 30 days)')).toBeInTheDocument();
  });

  it('shows nothing when the request fails', async () => {
    const fetch = mockFetch({ status: 503, body: { error: 'upstream_unavailable' } });
    const { container } = renderWithProviders(<UsageStats />);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector('.about__stats')).toBeNull();
  });
});
