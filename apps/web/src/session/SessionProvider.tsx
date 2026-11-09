import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SessionContext, type SessionState } from './context';
import { api } from '../api/client';
import { useSettings } from '../settings/context';

export function SessionProvider({ children }: { children: ReactNode }) {
  const { settings, setEmonId } = useSettings();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>(() =>
    settings.emonId ? { status: 'loading' } : { status: 'none' },
  );

  // Reopen the session for a stored EMON ID (app start, or after the API restarted).
  useEffect(() => {
    if (!settings.emonId) return;
    let active = true;
    void api.ensureSession(settings.emonId).then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { status: 'ready', capabilities: result.data.capabilities }
          : { status: 'error', error: result.error },
      );
    });
    return () => {
      active = false;
    };
  }, [settings.emonId]);

  const start = useCallback(
    async (emonId: string) => {
      const result = await api.openSession(emonId);
      if (result.ok) {
        setState({ status: 'ready', capabilities: result.data.capabilities });
        setEmonId(result.data.signature);
      }
      return result;
    },
    [setEmonId],
  );

  const clear = useCallback(async () => {
    await api.closeSession();
    // Forget cached household data as well.
    queryClient.clear();
    setEmonId(undefined);
    setState({ status: 'none' });
  }, [setEmonId, queryClient]);

  const value = useMemo(() => ({ state, start, clear }), [state, start, clear]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
