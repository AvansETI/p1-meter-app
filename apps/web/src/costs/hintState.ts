/** Whether the tariff hint was shown since the app started (also across tab switches). */
let shown = false;

/** Marks the hint as shown; returns false when it already was. */
export function claimTariffHint(): boolean {
  if (shown) return false;
  shown = true;
  return true;
}

/** For tests: forget that the hint was shown. */
export function resetTariffHint(): void {
  shown = false;
}
