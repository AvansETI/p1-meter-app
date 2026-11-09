import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { unwrap } from '../api/unwrap';

const MINUTE_MS = 60_000;

export function useTodayTotals(emonId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['today', emonId],
    queryFn: () => unwrap(api.getToday()),
    enabled,
    refetchInterval: MINUTE_MS,
  });
}

export function useRecentSeries(emonId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['recent', emonId],
    queryFn: () => unwrap(api.getRecent()),
    enabled,
    refetchInterval: MINUTE_MS,
  });
}
