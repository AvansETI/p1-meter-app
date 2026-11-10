import type { TariffProfiles } from '@p1/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { unwrap } from '../api/unwrap';

const key = (emonId: string | undefined) => ['tariffs', emonId] as const;

export function useTariffs(emonId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: key(emonId),
    queryFn: () => unwrap(api.getTariffs()),
    enabled,
    staleTime: Infinity,
  });
}

export function useTariffVersions(emonId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...key(emonId), 'versions'],
    queryFn: () => unwrap(api.getTariffVersions()),
    enabled,
  });
}

/**
 * Saves the whole set against the version it was based on. On a conflict the caller shows a
 * message; the set is reloaded either way, so the screen always shows what is stored. Costs
 * depend on the tariffs (and on the comparison switch), so they are reloaded as well.
 */
export function useSaveTariffs(emonId: string | undefined) {
  const client = useQueryClient();
  const settle = () =>
    Promise.all(
      [key(emonId), ['costs-today', emonId], ['history', emonId]].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
  const save = useMutation({
    mutationFn: ({ profiles, version }: { profiles: TariffProfiles; version: number }) =>
      unwrap(api.saveTariffs(profiles, version)),
    onSuccess: (data) => client.setQueryData(key(emonId), data),
    onSettled: settle,
  });
  const restore = useMutation({
    mutationFn: (version: number) => unwrap(api.restoreTariffVersion(version)),
    onSuccess: (data) => client.setQueryData(key(emonId), data),
    onSettled: settle,
  });
  return { save, restore };
}
