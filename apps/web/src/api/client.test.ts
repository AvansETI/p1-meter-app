import { describe, expect, it, vi } from 'vitest';
import { onNewServerVersion } from '../pwa/serverVersion';
import { api } from './client';

describe('ApiClient', () => {
  it('passes the server version of each response on to the update check', async () => {
    const respond = (version?: string) =>
      new Response(JSON.stringify({ users: 0, kits: 0 }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          ...(version && { 'x-app-version': version }),
        },
      });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respond('test'))
      .mockResolvedValueOnce(respond('9.9.9'));
    const listener = vi.fn();
    const stop = onNewServerVersion(listener);
    await api.getStats();
    expect(listener).not.toHaveBeenCalled();
    await api.getStats();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
});
