import type { Period } from '@p1/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { unwrap } from '../api/unwrap';

/** History of one period; the current period refreshes every minute, older ones never change. */
export function useHistory(
  emonId: string | undefined,
  period: Period,
  date: string,
  isCurrent: boolean,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['history', emonId, period, date],
    queryFn: () => unwrap(api.getHistory(period, date)),
    enabled,
    refetchInterval: isCurrent ? 60_000 : false,
    staleTime: isCurrent ? 0 : Infinity,
    // Keep showing the previous period while the next one loads (no flicker when navigating).
    placeholderData: keepPreviousData,
  });
}
