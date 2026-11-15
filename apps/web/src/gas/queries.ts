import type { GasProfile } from '@p1/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { unwrap } from '../api/unwrap';
import type { GasSettings } from '../settings/storage';
import { stationOf } from './station';

/** While the API still fetches weather for a new station, ask again every 15 seconds. */
const PENDING_REFETCH_MS = 15_000;
/** Weather arrives once a day; an hour is fresh enough. */
const STALE_MS = 60 * 60_000;

export function useGasAnalysis(emonId: string | undefined, gas: GasSettings, enabled: boolean) {
  const station = stationOf(gas).station.code;
  const query = {
    station,
    base: gas.base,
    method: gas.method,
    cooking: String(gas.cooking) as 'true' | 'false',
    ...(gas.baseline !== undefined && { baseline: gas.baseline }),
  };
  return useQuery({
    queryKey: ['gas-analysis', emonId, query],
    queryFn: () => unwrap(api.getGasAnalysis(query)),
    enabled,
    staleTime: STALE_MS,
    refetchInterval: (q) => (q.state.data?.pending ? PENDING_REFETCH_MS : false),
  });
}

export function useGasHourly(emonId: string | undefined, gas: GasSettings, enabled: boolean) {
  const station = stationOf(gas).station.code;
  return useQuery({
    queryKey: ['gas-hourly', emonId, station],
    queryFn: () => unwrap(api.getGasHourly(station)),
    enabled,
    staleTime: STALE_MS,
    refetchInterval: (q) => (q.state.data?.pending ? PENDING_REFETCH_MS : false),
  });
}

export function useGasComparison(
  emonId: string | undefined,
  profile: GasProfile,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['gas-comparison', emonId, profile],
    queryFn: () => unwrap(api.getGasComparison(profile)),
    enabled,
    staleTime: STALE_MS,
  });
}

/** Shares (profile) or withdraws (null) the dwelling profile, then refreshes the comparison. */
export function useShareProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (profile: GasProfile | null) =>
      unwrap(profile ? api.shareGasProfile(profile) : api.unshareGasProfile()),
    onSettled: () => client.invalidateQueries({ queryKey: ['gas-comparison'] }),
  });
}
