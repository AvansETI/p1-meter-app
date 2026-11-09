const number = (decimals: number) =>
  new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const kw = number(2);
const kwh = number(1);
const m3 = number(2);

/** `3,52` — power in kW (unit added by the caller). */
export const formatKw = (value: number) => kw.format(Math.abs(value));
const watts = number(0);

/**
 * Power with a fitting unit: below 1 kW in whole watts (`930 W`), otherwise kW with two
 * decimals (`3,52 kW`). The sign is dropped; direction is shown separately.
 */
export function formatPower(kwValue: number): { value: string; unit: 'W' | 'kW' } {
  const abs = Math.abs(kwValue);
  // Round first, so 0,9996 kW becomes "1,00 kW" rather than "1000 W".
  if (Math.round(abs * 1000) < 1000)
    return { value: watts.format(Math.round(abs * 1000)), unit: 'W' };
  return { value: kw.format(abs), unit: 'kW' };
}

/** `930 W` / `3,52 kW` as one string. */
export const formatPowerText = (kwValue: number) => {
  const { value, unit } = formatPower(kwValue);
  return `${value} ${unit}`;
};

/** `12,4` — energy in kWh; negative values keep their sign (`−2,1`). */
export const formatKwh = (value: number) => kwh.format(value).replace('-', '−');
/** `0,68` — gas in m³. */
export const formatM3 = (value: number) => m3.format(value);

const time = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const dateTime = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** `12:04:31` for today, otherwise `14 okt 15:38`. */
export function formatMoment(iso: string, now = new Date()): string {
  const date = new Date(iso);
  return date.toDateString() === now.toDateString() ? time.format(date) : dateTime.format(date);
}
