import { XMLParser } from 'fast-xml-parser';

export interface PricePoint {
  time: Date;
  /** EUR per kWh, excluding VAT. */
  eurPerKwh: number;
  resolution: 'PT15M' | 'PT60M';
}

const AREA_NL = '10YNL----------L';
const RESOLUTION_MS = { PT15M: 15 * 60_000, PT60M: 60 * 60_000 } as const;

/** ENTSO-E uses yyyyMMddHHmm in UTC for period start and end. */
const entsoeTime = (date: Date) => date.toISOString().replace(/[-:T]/g, '').slice(0, 12);

/** URL for NL day-ahead prices (document type A44) between two instants. */
export function entsoeUrl(token: string, start: Date, end: Date): string {
  const params = new URLSearchParams({
    securityToken: token,
    documentType: 'A44',
    in_Domain: AREA_NL,
    out_Domain: AREA_NL,
    periodStart: entsoeTime(start),
    periodEnd: entsoeTime(end),
  });
  return `https://web-api.tp.entsoe.eu/api?${params.toString()}`;
}

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

interface RawPoint {
  position: number;
  'price.amount': number;
}
interface RawPeriod {
  timeInterval: { start: string; end: string };
  resolution: string;
  Point?: RawPoint | RawPoint[];
}
interface RawSeries {
  Period?: RawPeriod | RawPeriod[];
}

/**
 * Parses an ENTSO-E day-ahead price document. With curve type A03, positions whose price equals
 * the previous one are omitted; they are filled in here. A "no data" acknowledgement yields [].
 * Prices are converted from EUR/MWh to EUR/kWh.
 */
export function parseEntsoe(xml: string): PricePoint[] {
  const doc = new XMLParser({ ignoreAttributes: true, parseTagValue: true }).parse(xml) as {
    Publication_MarketDocument?: { TimeSeries?: RawSeries | RawSeries[] };
  };
  const result = new Map<number, PricePoint>();
  for (const series of asArray(doc.Publication_MarketDocument?.TimeSeries)) {
    for (const period of asArray(series.Period)) {
      if (period.resolution !== 'PT15M' && period.resolution !== 'PT60M') continue;
      const resolution = period.resolution;
      const step = RESOLUTION_MS[resolution];
      const start = Date.parse(period.timeInterval.start);
      const end = Date.parse(period.timeInterval.end);
      const byPosition = new Map(
        asArray(period.Point).map((p) => [Number(p.position), Number(p['price.amount'])]),
      );
      let price: number | undefined;
      for (let position = 1; start + (position - 1) * step < end; position++) {
        price = byPosition.get(position) ?? price; // A03: missing = same as previous
        if (price === undefined) continue;
        const time = start + (position - 1) * step;
        // Prefer quarter-hour values when a document contains both resolutions.
        const existing = result.get(time);
        if (existing && existing.resolution === 'PT15M' && resolution === 'PT60M') continue;
        // EUR/MWh with 2 decimals → EUR/kWh; round away floating-point noise.
        result.set(time, {
          time: new Date(time),
          eurPerKwh: Number((price / 1000).toFixed(6)),
          resolution,
        });
      }
    }
  }
  return [...result.values()].sort((a, b) => a.time.getTime() - b.time.getTime());
}
