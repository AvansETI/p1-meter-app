import type { TariffsResponse } from '@p1/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIGNATURE } from '../test/fixtures';
import { useSaveTariffs } from './queries';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSaveTariffs', () => {
  it('reloads costs after saving, so the comparison switch applies at once', async () => {
    const saved: TariffsResponse = {
      profiles: {
        own: { periods: [] },
        compare: { name: 'Dynamisch', enabled: false, periods: [] },
      },
      version: 2,
      updatedAt: '2026-11-10T10:00:00Z',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(saved), { status: 200 }),
    );
    const client = new QueryClient();
    client.setQueryData(['costs-today', SIGNATURE], { configured: true });
    client.setQueryData(['history', SIGNATURE, 'day', '2026-11-10'], { buckets: [] });
    client.setQueryData(['history', 'other', 'day', '2026-11-10'], { buckets: [] });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveTariffs(SIGNATURE), { wrapper });

    await act(() => result.current.save.mutateAsync({ profiles: saved.profiles, version: 1 }));

    const stale = (queryKey: unknown[]) => client.getQueryState(queryKey)?.isInvalidated;
    expect(stale(['costs-today', SIGNATURE])).toBe(true);
    expect(stale(['history', SIGNATURE, 'day', '2026-11-10'])).toBe(true);
    expect(stale(['history', 'other', 'day', '2026-11-10'])).toBe(false);
  });
});
