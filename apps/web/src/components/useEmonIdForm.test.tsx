import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '../session/SessionProvider';
import { useSettings } from '../settings/context';
import { SettingsProvider } from '../settings/SettingsProvider';
import { DEFAULT_SETTINGS } from '../settings/storage';
import { SIGNATURE, sessionResponse } from '../test/fixtures';
import { mockFetch } from '../test/render';
import { useEmonIdForm } from './useEmonIdForm';

afterEach(() => {
  vi.restoreAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider initial={DEFAULT_SETTINGS}>
    <SessionProvider>{children}</SessionProvider>
  </SettingsProvider>
);

function setup(onDone?: () => void) {
  return renderHook(() => ({ form: useEmonIdForm(onDone), settings: useSettings().settings }), {
    wrapper,
  });
}

describe('useEmonIdForm', () => {
  it('formats input while typing', () => {
    const { result } = setup();
    act(() => void result.current.form.input('a1b2 c30000-00'));
    expect(result.current.form.value).toBe('A1B2C3-000000');
  });

  it('rejects an incomplete ID without calling the API', async () => {
    const fetch = mockFetch();
    const { result } = setup();
    act(() => void result.current.form.input('a1b2c3'));
    await act(() => result.current.form.submit());
    expect(result.current.form.error).toBe('invalid_format');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 404, body: { error: 'not_found' } }, 'not_found'],
    [{ status: 429, body: { error: 'rate_limited' } }, 'rate_limited'],
    [{ status: 502, body: '<html>' }, 'upstream_unavailable'],
    [new TypeError('network down'), 'upstream_unavailable'],
  ] as const)('maps %j to %s', async (response, error) => {
    mockFetch(response);
    const { result } = setup();
    act(() => void result.current.form.input('A1B2C3-000000'));
    await act(() => result.current.form.submit());
    expect(result.current.form.error).toBe(error);
    expect(result.current.settings.emonId).toBeUndefined();
  });

  it('stores the canonical ID and calls onDone after a successful lookup', async () => {
    const fetch = mockFetch({ status: 200, body: sessionResponse() });
    const onDone = vi.fn();
    const { result } = setup(onDone);
    act(() => void result.current.form.input('a1b2c3000000'));
    await act(() => result.current.form.submit());
    expect(onDone).toHaveBeenCalled();
    expect(result.current.settings.emonId).toBe(SIGNATURE);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/v1/session');
    expect(JSON.parse(init?.body as string)).toEqual({ emonId: 'A1B2C3-000000' });
  });
});
