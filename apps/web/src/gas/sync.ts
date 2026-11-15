import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { api } from '../api/client';
import { unwrap } from '../api/unwrap';
import { useSettings } from '../settings/context';
import { sharedGas } from '../settings/storage';

const SAVE_KEY = ['gas-settings-save'];
/** A change is sent after this much quiet, so typing does not send every keystroke. */
export const SAVE_DELAY_MS = 1000;

/**
 * Keeps the gas settings in step with the household's copy on the server, on start-up, on a
 * change of emon id and when the app returns to the foreground; last write wins
 * (docs/design/2026-11-15-shared-gas-settings.md §6).
 */
export function useGasSettingsSync(emonId: string | undefined, active: boolean) {
  const { settings, adoptGas, markGasSynced } = useSettings();
  const latest = useRef(settings);
  useLayoutEffect(() => {
    latest.current = settings;
  });
  const client = useQueryClient();

  const save = useMutation({
    mutationKey: SAVE_KEY,
    mutationFn: (sent: ReturnType<typeof sharedGas>) => unwrap(api.saveGasSettings(sent)),
    onSuccess: (_saved, sent) => {
      if (emonId) markGasSynced(sent, emonId);
      void client.invalidateQueries({ queryKey: ['gas-comparison'] });
    },
  });
  const { mutate } = save;
  const push = useCallback(() => mutate(sharedGas(latest.current.gas)), [mutate]);

  const pull = useCallback(async () => {
    if (!emonId) return;
    const result = await api.getGasSettings();
    if (!result.ok) return;
    const local = latest.current;
    const ours = local.gasSyncedFor === undefined || local.gasSyncedFor === emonId;
    if (local.gasDirty && ours) push();
    else if (result.data.settings) adoptGas(result.data.settings, emonId);
    // First run: this device's settings become the household's.
    else if (ours) push();
    // Never copy one household's settings to another.
    else adoptGas(null, emonId);
  }, [emonId, push, adoptGas]);

  useEffect(() => {
    if (!active) return;
    void pull();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [active, pull]);

  // Only for this household: a change made under another emon id waits for the next pull.
  const dirty = active && settings.gasDirty === true && settings.gasSyncedFor === emonId;
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(push, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, settings.gas, push]);
}

/** True when the latest save failed; the change is kept and sent again later. */
export function useGasSaveFailed(): boolean {
  const statuses = useMutationState({
    filters: { mutationKey: SAVE_KEY },
    select: (m) => m.state.status,
  });
  return statuses.at(-1) === 'error';
}
