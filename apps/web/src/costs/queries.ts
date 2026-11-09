import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { unwrap } from '../api/unwrap';

/** Costs so far today; refreshed every minute (costs design §7.1). */
export function useCostsToday(emonId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['costs-today', emonId],
    queryFn: () => unwrap(api.getCostsToday()),
    enabled,
    refetchInterval: 60_000,
  });
}
