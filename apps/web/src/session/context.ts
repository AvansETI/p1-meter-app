import type { ApiErrorCode, Capabilities } from '@p1/shared';
import { createContext, useContext } from 'react';
import type { ApiResult } from '../api/client';

export type SessionState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; capabilities: Capabilities }
  | { status: 'error'; error: ApiErrorCode };

export interface SessionValue {
  state: SessionState;
  /** Checks an EMON ID entered by the user; on success it is stored and becomes active. */
  start: (emonId: string) => Promise<ApiResult<unknown>>;
  /** Forgets the EMON ID and all session data. */
  clear: () => Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
