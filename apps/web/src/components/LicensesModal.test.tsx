import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import LicensesModal, { LICENSES_URL } from './LicensesModal';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockResponse(body: string, contentType: string, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(body, { status, headers: { 'content-type': contentType } }));
}

function renderModal() {
  return renderWithProviders(<LicensesModal isOpen onClose={() => {}} />);
}

describe('LicensesModal', () => {
  it('shows the license text', async () => {
    const fetch = mockResponse('react 18.3.1\nMIT License', 'text/plain; charset=utf-8');
    renderModal();
    expect(await screen.findByText(/MIT License/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(LICENSES_URL);
  });

  it('shows an error when the text cannot be loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    renderModal();
    expect(await screen.findByRole('alert')).toHaveTextContent('De licenties konden niet');
  });

  it('treats an HTML fallback page as an error', async () => {
    mockResponse('<!doctype html><title>MNEXT Energiemeter</title>', 'text/html');
    renderModal();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
