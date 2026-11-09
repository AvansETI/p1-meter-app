import { formatEmonIdInput, normalizeEmonId, type ApiErrorCode } from '@p1/shared';
import { useState } from 'react';
import { useSession } from '../session/context';

/** State and actions of the EMON ID form, independent of the input component. */
export function useEmonIdForm(onDone?: () => void) {
  const { start } = useSession();
  const [value, setValue] = useState('');
  const [error, setError] = useState<ApiErrorCode | undefined>();
  const [busy, setBusy] = useState(false);

  /** Formats raw input (`a1b2c3000000` → `A1B2C3-000000`) and returns the formatted value. */
  function input(raw: string): string {
    const formatted = formatEmonIdInput(raw);
    setValue(formatted);
    setError(undefined);
    return formatted;
  }

  async function submit(): Promise<void> {
    if (!normalizeEmonId(value).ok) {
      setError('invalid_format');
      return;
    }
    setBusy(true);
    setError(undefined);
    const result = await start(value);
    setBusy(false);
    if (result.ok) onDone?.();
    else setError(result.error);
  }

  return { value, error, busy, input, submit };
}
