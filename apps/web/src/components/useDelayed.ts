import { useEffect, useState } from 'react';

/** True once `active` has lasted `delayMs`; quick updates then show no indicator (#52). */
export function useDelayed(active: boolean, delayMs = 500): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => {
      clearTimeout(timer);
      setShown(false);
    };
  }, [active, delayMs]);
  return active && shown;
}
