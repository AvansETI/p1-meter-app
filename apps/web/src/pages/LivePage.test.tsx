import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIGNATURE, sessionResponse } from '../test/fixtures';
import { mockFetch, renderWithProviders } from '../test/render';
import LivePage from './LivePage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LivePage', () => {
  it('mentions export for households with export', async () => {
    mockFetch({ status: 200, body: sessionResponse({ hasExport: true }) });
    renderWithProviders(<LivePage />, { emonId: SIGNATURE });
    expect(await screen.findByText(/verbruik en teruglevering/)).toBeInTheDocument();
  });

  it('leaves out everything about export without export', async () => {
    mockFetch({ status: 200, body: sessionResponse({ hasExport: false }) });
    renderWithProviders(<LivePage />, { emonId: SIGNATURE });
    expect(await screen.findByText('Hier komt je actuele verbruik.')).toBeInTheDocument();
    expect(screen.queryByText(/teruglevering/i)).toBeNull();
  });
});
