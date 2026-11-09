import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { energyZeroGasUrl, parseEnergyZero } from './energyzero';
import { entsoeUrl, parseEntsoe } from './entsoe';

const fixture = (name: string) =>
  readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

describe('parseEntsoe', () => {
  it('fills positions omitted by curve type A03 and converts to EUR/kWh', () => {
    const points = parseEntsoe(fixture('entsoe-pt15m-a03.xml'));
    expect(points.map((p) => [p.time.toISOString(), p.eurPerKwh, p.resolution])).toEqual([
      ['2026-11-08T23:00:00.000Z', 0.24611, 'PT15M'],
      ['2026-11-08T23:15:00.000Z', 0.23684, 'PT15M'],
      ['2026-11-08T23:30:00.000Z', 0.23684, 'PT15M'], // omitted → previous price
      ['2026-11-08T23:45:00.000Z', -0.0055, 'PT15M'], // negative prices are kept
    ]);
  });

  it('reads hourly prices, also across the DST change', () => {
    const points = parseEntsoe(fixture('entsoe-pt60m.xml'));
    expect(points).toHaveLength(3);
    expect(points[2]).toMatchObject({ eurPerKwh: 0.07, resolution: 'PT60M' });
    expect(points[2]!.time.toISOString()).toBe('2025-03-30T01:00:00.000Z');
  });

  it('returns nothing for a no-data acknowledgement', () => {
    expect(parseEntsoe(fixture('entsoe-no-data.xml'))).toEqual([]);
  });

  it('builds the request for NL with UTC period bounds', () => {
    const url = new URL(
      entsoeUrl('t', new Date('2026-11-08T23:00:00Z'), new Date('2026-11-09T23:00:00Z')),
    );
    expect(url.searchParams.get('in_Domain')).toBe('10YNL----------L');
    expect(url.searchParams.get('periodStart')).toBe('202611082300');
    expect(url.searchParams.get('periodEnd')).toBe('202611092300');
  });
});

describe('EnergyZero gas', () => {
  it('parses hourly prices and ignores malformed entries', () => {
    const points = parseEnergyZero({
      Prices: [
        { readingDate: '2026-11-08T23:00:00Z', price: 0.84 },
        { readingDate: 'x' },
        { price: 1 },
      ],
    });
    expect(points).toEqual([{ time: new Date('2026-11-08T23:00:00Z'), eurPerM3: 0.84 }]);
    expect(parseEnergyZero({})).toEqual([]);
  });

  it('requests excl. VAT gas prices for the range', () => {
    const url = new URL(
      energyZeroGasUrl(new Date('2026-11-08T23:00:00Z'), new Date('2026-11-09T23:00:00Z')),
    );
    expect(url.searchParams.get('usageType')).toBe('3');
    expect(url.searchParams.get('inclBtw')).toBe('false');
    expect(url.searchParams.get('tillDate')).toBe('2026-11-09T22:59:59.999Z');
  });
});
