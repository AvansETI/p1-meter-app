import { describe, expect, it } from 'vitest';
import { addDays, formatPlainDate } from '../calendar';
import {
  autoBaseline,
  expectedSoFar,
  fillGaps,
  autoBaselineByMonth,
  degreeDaysToDate,
  chooseBaseline,
  forecastYear,
  heatingLine,
  normalised,
  normals,
  periods,
  rateDays,
  rollingCorrected,
  referenceAnnual,
  yearSummaries,
  type GasDay,
} from './analysis';
import { degreeDays, seasonWeight } from './degreeDays';
import {
  CALENDAR_START,
  HEATING_START,
  parseYearStart,
  yearLabel,
  yearLength,
  yearOf,
} from './years';
import { dayProfile, temperatureCurve, type GasHourSample } from './hourly';
import { postcodeRegion, stationForPostcode } from './postcodes';
import {
  cbsKey,
  CBS_CODES,
  groupCandidates,
  matchesGroup,
  percentileRank,
  quantile,
} from './profile';
import { nearestStation, STATIONS } from './stations';

/** Days from `start` with a temperature pattern and gas = 1 + 0.3 × plain degree days (18 °C). */
function syntheticDays(start: string, count: number, temp: (i: number) => number): GasDay[] {
  const first = { year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)), day: 1 };
  return Array.from({ length: count }, (_, i) => {
    const t = temp(i);
    return {
      day: formatPlainDate(addDays(first, i)),
      m3: 1 + 0.3 * Math.max(0, 18 - t),
      t,
      fh: 3,
    };
  });
}
/** A year from January: cold winter, warm summer. */
const seasonal = (i: number) => 10 - 9 * Math.cos((2 * Math.PI * (i - 15)) / 365);

describe('degree days', () => {
  it('weights the seasons', () => {
    expect([1, 3, 4, 9, 10, 11, 12].map(seasonWeight)).toEqual([1.1, 1, 0.8, 0.8, 1, 1.1, 1.1]);
  });

  it('computes plain, weighted and effective degree days', () => {
    expect(degreeDays({ t: 8, fh: 3 }, 1, 18, 'plain')).toBe(10);
    expect(degreeDays({ t: 8, fh: 3 }, 1, 18, 'weighted')).toBeCloseTo(11);
    expect(degreeDays({ t: 8, fh: 3 }, 1, 18, 'effective')).toBeCloseTo(13.2);
    expect(degreeDays({ t: 20, fh: 0 }, 7, 18, 'weighted')).toBe(0);
  });
});

describe('analysis', () => {
  const days = syntheticDays('2025-01-01', 365, seasonal);
  const rated = rateDays(days, 18, 'plain');

  it('finds the baseline from days without heating demand', () => {
    expect(autoBaseline(days, 18)).toBeCloseTo(1);
    expect(autoBaseline(days.slice(0, 30), 18)).toBeNull();
  });

  it('determines the baseline per month over the 12 months before', () => {
    const twoYears = syntheticDays('2024-01-01', 731, seasonal).map((d) =>
      // Hot water moved to electricity in 2025: half a cubic metre less per day.
      d.day >= '2025' ? { ...d, m3: d.m3! - 0.5 } : d,
    );
    const byMonth = autoBaselineByMonth(twoYears, 18);
    expect(byMonth.get('2024-12')).toBeCloseTo(1);
    // Mid-2025 the window holds both summers' warm days; by December only 2025's.
    expect(byMonth.get('2025-12')).toBeCloseTo(0.5);
    const rated2 = rateDays(twoYears, 18, 'plain');
    const of = (day: string) => byMonth.get(day.slice(0, 7)) ?? 1;
    const months = periods(rated2, of, 'month');
    expect(months.find((m) => m.key === '2024-12')!.perDd).toBeCloseTo(0.3);
    expect(months.find((m) => m.key === '2025-12')!.perDd).toBeCloseTo(0.3);
    const years = yearSummaries(rated2, of, 2500);
    expect(years[0]!.baseline).toBeCloseTo(1, 1);
  });

  it('ignores days without any gas (nobody home) for the baseline', () => {
    // Half of the warm days are a holiday with zero use.
    let warm = 0;
    const holiday = days.map((d) => (d.t! >= 18 && warm++ % 2 === 0 ? { ...d, m3: 0 } : d));
    expect(autoBaseline(holiday, 18)).toBeCloseTo(1);
    // Nearly all warm days zero: no cooking or hot water on gas.
    const none = days.map((d) => (d.t! >= 18 ? { ...d, m3: 0 } : d));
    expect(autoBaseline(none, 18)).toBe(0);
  });

  it('fits the heating line', () => {
    const line = heatingLine(rated)!;
    expect(line.slope).toBeCloseTo(0.3);
    expect(line.intercept).toBeCloseTo(1);
    expect(line.r2).toBeCloseTo(1);
  });

  it('chooses off, manual, automatic or the line', () => {
    const line = { slope: 0.3, intercept: 0.8, r2: 1, n: 100 };
    expect(chooseBaseline({ cooking: false, auto: 1, line })).toEqual({ value: 0, source: 'off' });
    expect(chooseBaseline({ cooking: true, manual: 2, auto: 1, line }).source).toBe('manual');
    expect(chooseBaseline({ cooking: true, auto: 1, line }).value).toBe(1);
    expect(chooseBaseline({ cooking: true, auto: null, line })).toEqual({
      value: 0.8,
      source: 'line',
    });
  });

  it('gives heating gas per degree day per month, without summer months', () => {
    const months = periods(rated, 1, 'month');
    expect(months).toHaveLength(12);
    expect(months[0]!.perDd).toBeCloseTo(0.3);
    expect(months.find((m) => m.key === '2025-07')!.perDd).toBeNull();
    expect(periods(rated, 1, 'week')[1]!.key).toBe('2025-W02');
  });

  it('normalises a year to normal degree days', () => {
    expect(normalised({ days: 10, m3: 40, dd: 100 }, 1, 200, 10)).toBe(10 + 30 * 2);
    expect(normalised({ days: 10, m3: 40, dd: 0 }, 1, 200, 10)).toBeNull();
    const [year] = yearSummaries(
      rated,
      1,
      rated.reduce((s, d) => s + d.dd!, 0),
    );
    expect(year!.complete).toBe(true);
    expect(year!.corrected).toBeCloseTo(year!.m3);
  });

  it('builds normals per calendar day and per year', () => {
    const weather = [2023, 2024].flatMap((y) =>
      syntheticDays(`${y}-01-01`, 365, seasonal).map((d) => ({ day: d.day, t: d.t!, fh: 3 })),
    );
    const result = normals(weather, 18, 'plain');
    expect(result.years).toBe(2);
    expect(result.byDay['01-15']).toBeCloseTo(17);
    const sum = (year: string) =>
      weather.filter((d) => d.day.startsWith(year)).reduce((s, d) => s + Math.max(0, 18 - d.t), 0);
    expect(result.annual).toBeCloseTo((sum('2023') + sum('2024')) / 2);
  });

  it('forecasts the year from measured days and normal weather', () => {
    const half = rated.slice(0, 181);
    const line = heatingLine(rated)!;
    const normalsFromYear = normals(
      days.map((d) => ({ day: d.day, t: d.t!, fh: 3 })),
      18,
      'plain',
    );
    const forecast = forecastYear(half, '2025-07-01', 1, line, normalsFromYear)!;
    const total = days.reduce((s, d) => s + d.m3!, 0);
    expect(forecast.total).toBeCloseTo(total, 0);
    expect(forecastYear(half, '2025-07-01', 1, null, normalsFromYear)).toBeNull();
  });

  it('sums degree days of the year so far against the normal for the same days', () => {
    const normalsFromYear = normals(
      days.map((d) => ({ day: d.day, t: d.t!, fh: 3 })),
      18,
      'plain',
    );
    const result = degreeDaysToDate(rated, '2025-03-01', normalsFromYear)!;
    expect(result.year).toBe(2025);
    expect(result.actual).toBeCloseTo(result.normal);
    expect(result.actual).toBeCloseTo(rated.slice(0, 59).reduce((s, d) => s + d.dd!, 0));
    expect(degreeDaysToDate(rated, '2027-03-01', normalsFromYear)).toBeNull();
  });

  it('corrects the last 365 days and the 365 days before', () => {
    const twoYears = rateDays(syntheticDays('2024-01-01', 730, seasonal), 18, 'plain');
    const dd = twoYears.slice(-365).reduce((s, d) => s + d.dd!, 0);
    const last = rollingCorrected(twoYears, 1, dd)!;
    expect(last.days).toBe(365);
    expect(last.corrected).toBeCloseTo(twoYears.slice(-365).reduce((s, d) => s + d.m3!, 0));
    expect(rollingCorrected(twoYears, 1, dd, 365)!.days).toBe(365);
    expect(rollingCorrected(twoYears.slice(0, 100), 1, dd)).toBeNull();
  });

  it('computes the reference value only with enough data and gas', () => {
    const dd = rateDays(days, 18, 'weighted').reduce((s, d) => s + d.dd!, 0);
    expect(referenceAnnual(days, dd)).toBeCloseTo(
      days.reduce((s, d) => s + d.m3!, 0),
      0,
    );
    expect(referenceAnnual(days.slice(0, 150), dd)).toBeNull();
    // Enough days, but only summer: too few degree days.
    expect(referenceAnnual(days.slice(120, 300), dd)).toBeNull();
    const noGas = days.map((d) => ({ ...d, m3: 0.05 }));
    expect(referenceAnnual(noGas, dd)).toBeNull();
  });
});

describe('gaps in the readings', () => {
  const rated = rateDays(
    syntheticDays('2026-01-01', 10, (i) => 18 - i),
    18,
    'plain',
  );
  const gapped = rated.map((d, i) => (i >= 3 && i <= 6 ? { ...d, m3: null } : d));

  it("spreads the meter's use over the gap by expected use", () => {
    const filled = fillGaps(
      gapped,
      [{ from: '2026-01-04', to: '2026-01-07', m3: 12 }],
      (d) => 1 + 0.3 * d.dd!,
    );
    const gap = filled.slice(3, 7);
    expect(gap.every((d) => d.filled)).toBe(true);
    expect(gap.reduce((s, d) => s + d.m3!, 0)).toBeCloseTo(12, 2);
    // Colder days get more.
    expect(gap[3]!.m3!).toBeGreaterThan(gap[0]!.m3!);
    expect(filled[2]).toEqual(gapped[2]);
    // Totals say how many of their days are estimated.
    expect(periods(filled, 1, 'month')[0]).toMatchObject({ days: 10, filled: 4 });
    expect(yearSummaries(filled, 1, 3000)[0]).toMatchObject({ days: 10, filled: 4 });
  });

  it('spreads evenly without expected use, and skips a gap past the days', () => {
    const even = fillGaps(gapped, [{ from: '2026-01-04', to: '2026-01-07', m3: 8 }], () => 0);
    expect(even.slice(3, 7).map((d) => d.m3)).toEqual([2, 2, 2, 2]);
    expect(fillGaps(gapped, [{ from: '2026-01-09', to: '2026-01-12', m3: 8 }], () => 1)).toEqual(
      gapped,
    );
  });

  it('keeps filled days out of the heating line and the baseline', () => {
    const days = syntheticDays('2026-01-01', 120, seasonal);
    const line = heatingLine(rateDays(days, 18, 'plain'))!;
    const noisy = rateDays(days, 18, 'plain').map((d, i) =>
      i % 3 === 0 ? { ...d, m3: 50, filled: true } : d,
    );
    expect(heatingLine(noisy)!.slope).toBeCloseTo(line.slope, 6);
  });
});

describe('year division', () => {
  const contract = { month: 3, day: 1 };

  it('finds the year of a day and labels it', () => {
    expect(yearOf('2026-02-28', contract)).toBe(2025);
    expect(yearOf('2026-03-01', contract)).toBe(2026);
    expect(yearLabel(2026, contract)).toBe('2026-2027');
    expect(yearLabel(2026, CALENDAR_START)).toBe('2026');
    expect(yearOf('2026-06-30', HEATING_START)).toBe(2025);
    expect(yearLength(2027, contract)).toBe(366); // includes 29 February 2028
  });

  it('parses a contract start, also 29 February', () => {
    expect(parseYearStart('2025-03-15')).toEqual({ month: 3, day: 15 });
    expect(parseYearStart('02-29')).toEqual({ month: 2, day: 28 });
    expect(parseYearStart('13-01')).toBeNull();
  });

  const twoYears = rateDays(syntheticDays('2024-01-01', 731, seasonal), 18, 'plain');
  const normalsFromData = normals(
    syntheticDays('2024-01-01', 731, seasonal).map((d) => ({ day: d.day, t: d.t!, fh: 3 })),
    18,
    'plain',
  );

  it('sums years from the contract start', () => {
    const years = yearSummaries(twoYears, 1, normalsFromData.annual, contract);
    expect(years.map((y) => y.label)).toEqual(['2023-2024', '2024-2025', '2025-2026']);
    expect(years[1]!.days).toBe(365);
    expect(periods(twoYears, 1, 'year', contract).map((p) => p.start)).toEqual([
      '2023-03-01',
      '2024-03-01',
      '2025-03-01',
    ]);
  });

  it('forecasts and counts degree days over the contract year', () => {
    const line = heatingLine(twoYears)!;
    const forecast = forecastYear(twoYears, '2025-06-01', 1, line, normalsFromData, contract)!;
    expect(forecast.label).toBe('2025-2026');
    const dd = degreeDaysToDate(twoYears, '2025-06-01', normalsFromData, contract)!;
    expect(dd.label).toBe('2025-2026');
    expect(dd.actual).toBeCloseTo(
      twoYears
        .filter((d) => d.day >= '2025-03-01' && d.day < '2025-06-01')
        .reduce((s, d) => s + d.dd!, 0),
    );
  });

  it('compares the year so far with the expected use at the actual weather', () => {
    // Expected use equal to the real pattern: actual and expected so far agree.
    const annual = twoYears.slice(0, 366).reduce((s, d) => s + d.m3!, 0);
    const dd = twoYears.slice(0, 366).reduce((s, d) => s + d.dd!, 0);
    const result = expectedSoFar(twoYears, '2024-06-01', 1, annual, dd)!;
    expect(result.days).toBe(152);
    expect(result.expected / result.actual).toBeCloseTo(1, 2);
    // Expecting twice the heating gas: the household is well under.
    const more = expectedSoFar(twoYears, '2024-06-01', 1, annual * 2 - 366, dd)!;
    expect(more.expected).toBeGreaterThan(more.actual * 1.5);
  });
});

describe('hourly', () => {
  const samples: GasHourSample[] = Array.from({ length: 240 }, (_, i) => ({
    hour: i % 24,
    t: i < 120 ? 2 : 8,
    m3: i < 120 ? 0.3 : 0.1,
    dayT: i < 120 ? 2 : 8,
  }));

  it('bins gas per whole degree', () => {
    const curve = temperatureCurve(samples);
    expect(curve.map((b) => [b.t, b.n])).toEqual([
      [2, 120],
      [8, 120],
    ]);
    expect(curve[0]!.m3).toBeCloseTo(0.3);
    expect(curve[1]!.m3).toBeCloseTo(0.1);
    expect(temperatureCurve(samples.slice(0, 4))).toEqual([]);
  });

  it('profiles cold and mild days per hour', () => {
    expect(dayProfile(samples, 'cold')![0]).toBeCloseTo(0.3);
    expect(dayProfile(samples, 'mild')![23]).toBeCloseTo(0.1);
    expect(dayProfile(samples.slice(0, 120), 'mild')).toBeNull();
  });
});

describe('location', () => {
  it('reads the region from a postcode', () => {
    expect(postcodeRegion('3511 AB')).toBe('35');
    expect(postcodeRegion('35')).toBe('35');
    expect(postcodeRegion('0911')).toBeNull();
    expect(postcodeRegion('abc')).toBeNull();
  });

  it('picks the nearest station', () => {
    expect(stationForPostcode('35')!.code).toBe(260); // Utrecht → De Bilt
    expect(stationForPostcode('62')!.code).toBe(380); // Maastricht
    expect(stationForPostcode('97')!.code).toBe(280); // Groningen → Eelde
    expect(nearestStation(STATIONS[3]!.lat, STATIONS[3]!.lon)).toBe(STATIONS[3]);
  });
});

describe('profile', () => {
  it('maps a profile onto CBS codes, unknown fields as total', () => {
    expect(cbsKey({})).toEqual({
      type: CBS_CODES.type.total,
      area: CBS_CODES.area.total,
      period: CBS_CODES.period.total,
      residents: CBS_CODES.residents.total,
      heating: CBS_CODES.heating.total,
    });
    expect(cbsKey({ type: 'terraced', solar: false, heating: 'hybrid' })).toMatchObject({
      type: 'ZW25805',
      heating: 'A052168',
    });
  });

  it('broadens groups in the fallback order', () => {
    expect(
      groupCandidates({ type: 'terraced', area: '100to150', solar: true, residents: '2' }),
    ).toEqual([
      { type: 'terraced', area: '100to150', solar: true, residents: '2' },
      { type: 'terraced', area: '100to150', residents: '2' },
      { type: 'terraced', area: '100to150' },
      { type: 'terraced' },
    ]);
    expect(groupCandidates({})).toEqual([]);
    expect(matchesGroup({ type: 'terraced', area: 'lt50' }, { type: 'terraced' })).toBe(true);
    expect(matchesGroup({ area: 'lt50' }, { type: 'terraced' })).toBe(false);
  });

  it('computes quantiles and percentile ranks', () => {
    const values = [100, 200, 300, 400, 500];
    expect(quantile(values, 0.5)).toBe(300);
    expect(quantile(values, 0.1)).toBe(140);
    expect(percentileRank(values, 300)).toBe(50);
    expect(percentileRank(values, 50)).toBe(0);
  });
});
