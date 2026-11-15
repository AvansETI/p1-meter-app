import { readFileSync } from 'node:fs';
import { REFERENCE_STATION } from '@p1/shared';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../db/database';
import { cbsRowsUrl, parseCbsPeriods, parseCbsRows, type CbsRow } from './cbs';
import { OpenDataJob, type OpenDataFetchers } from './job';
import { knmiHourlyBody, parseKnmiHourly, type WeatherHour } from './knmi';
import { MemoryOpenDataStore } from './store';

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')) as unknown;
const log = pino({ level: 'silent' });
const HOUR_MS = 3_600_000;

describe('KNMI', () => {
  it('asks for whole days: KNMI applies the hour window to every day', () => {
    const partial = knmiHourlyBody(
      260,
      new Date('2026-01-01T00:00Z'),
      new Date('2026-11-15T13:00Z'),
    );
    expect(partial.get('start')).toBe('2026010101');
    expect(partial.get('end')).toBe('2026111524');
  });

  it('asks for the hours ending in (from, to] in KNMI notation', () => {
    const body = knmiHourlyBody(260, new Date('2025-01-01T00:00Z'), new Date('2026-01-01T00:00Z'));
    expect(Object.fromEntries(body)).toMatchObject({
      stns: '260',
      vars: 'T:FH',
      start: '2025010101',
      end: '2025123124',
    });
  });

  it('parses hourly values in tenths, timestamped at the end of the hour', () => {
    const hours = parseKnmiHourly(fixture('knmi-hourly.json'));
    // KNMI answers whole days: the fixture asked for 11 January and got 11 and 12 January.
    expect(hours).toHaveLength(48);
    expect(hours[0]).toEqual({ time: new Date('2026-01-11T01:00Z'), t: -6.5, fh: 1 });
    expect(hours[23]!.time).toEqual(new Date('2026-01-12T00:00Z'));
    expect(hours[47]!.time).toEqual(new Date('2026-01-13T00:00Z'));
  });
});

describe('CBS', () => {
  it('lists the years and builds a row request per year and heating class', () => {
    expect(parseCbsPeriods(fixture('cbs-perioden.json'))).toContain(2025);
    expect(new URL(cbsRowsUrl(2025, 'A050299')).searchParams.get('$filter')).toBe(
      "Perioden eq '2025JJ00' and HoofdverwarmingEnZonnestroom eq 'A050299'",
    );
  });

  it('parses rows and skips suppressed cells', () => {
    const rows = parseCbsRows(fixture('cbs-rows.json'));
    expect(rows).toHaveLength(7); // the "unknown area" row has no figures
    expect(rows[4]).toMatchObject({
      year: 2025,
      type: 'ZW25805',
      area: 'A025410',
      heating: 'A050299',
      perDwelling: { mean: 940 },
      perM2: { mean: 8 },
    });
  });
});

describe('MemoryOpenDataStore', () => {
  it('averages hours per local day and needs 20 hours', async () => {
    const store = new MemoryOpenDataStore();
    // 2026-01-10 local runs from 2026-01-09T23:00Z; hour ends 00:00Z … 23:00Z the next day.
    const start = Date.parse('2026-01-09T23:00Z');
    await store.writeWeather(
      260,
      Array.from({ length: 30 }, (_, i) => ({
        time: new Date(start + (i + 1) * HOUR_MS),
        t: i < 24 ? 4 : 10,
        fh: 2,
      })),
    );
    expect(
      await store.dailyWeather(260, new Date('2026-01-01T00:00Z'), new Date('2026-02-01T00:00Z')),
    ).toEqual([{ day: '2026-01-10', t: 4, fh: 2 }]);
  });
});

function fakeFetchers() {
  const calls: string[] = [];
  const fetchers: OpenDataFetchers = {
    knmi(station, from, to) {
      calls.push(`knmi ${station} ${from.toISOString().slice(0, 10)}`);
      const hours: WeatherHour[] = [];
      for (let t = from.getTime() + HOUR_MS; t <= to.getTime(); t += HOUR_MS) {
        hours.push({ time: new Date(t), t: 5, fh: 3 });
      }
      return Promise.resolve(hours);
    },
    cbsYears() {
      calls.push('cbs years');
      return Promise.resolve([2024, 2025]);
    },
    cbsRows(year, heating) {
      calls.push(`cbs ${year} ${heating}`);
      const figures = {
        mean: 1,
        p10: 1,
        p20: 1,
        p30: 1,
        p40: 1,
        p50: 1,
        p60: 1,
        p70: 1,
        p80: 1,
        p90: 1,
      };
      return Promise.resolve([
        {
          year,
          type: 'T001100',
          area: 'T001116',
          period: 'T001018',
          residents: 'T001351',
          heating,
          perDwelling: figures,
          perM2: null,
        } satisfies CbsRow,
      ]);
    },
  };
  return { calls, fetchers };
}

describe('OpenDataJob', () => {
  const now = new Date('2026-11-15T12:00:00Z');

  it('fills 20 years plus the current year once, then only what is new', async () => {
    const store = new MemoryOpenDataStore();
    const { calls, fetchers } = fakeFetchers();
    const db = openDatabase(':memory:');
    const job = new OpenDataJob(store, fetchers, db, log, { pauseMs: 0, now: () => now });
    expect(job.ready(REFERENCE_STATION)).toBe(false);
    await job.tick();
    const knmi = calls.filter((c) => c.startsWith('knmi'));
    expect(knmi).toHaveLength(21);
    expect(knmi[0]).toBe('knmi 260 2026-01-01');
    expect(knmi.at(-1)).toBe('knmi 260 2006-01-01');
    expect(job.ready(REFERENCE_STATION)).toBe(true);
    // CBS: the year list plus 3 heating classes per year.
    expect(calls.filter((c) => c.startsWith('cbs'))).toHaveLength(7);
    expect(await job.cbsRows()).toHaveLength(6);

    calls.length = 0;
    await job.tick();
    expect(calls).toEqual([]);
  });

  it('refetches the current year when it has gaps', async () => {
    const store = new MemoryOpenDataStore();
    const { calls, fetchers } = fakeFetchers();
    const job = new OpenDataJob(store, fetchers, openDatabase(':memory:'), log, {
      pauseMs: 0,
      now: () => now,
    });
    await job.tick();
    // Only the last week of the year so far is stored.
    const hours = store.weather.get(260)!;
    for (const time of [...hours.keys()]) {
      if (time >= Date.parse('2026-01-01') && time < Date.parse('2026-11-01')) hours.delete(time);
    }
    calls.length = 0;
    await new OpenDataJob(store, fetchers, openDatabase(':memory:'), log, {
      pauseMs: 0,
      now: () => new Date(now.getTime() + 4 * HOUR_MS),
    }).tick();
    expect(calls.filter((c) => c.startsWith('knmi'))).toEqual(['knmi 260 2026-01-01']);
  });

  it('fetches a newly used station and reports it', async () => {
    const store = new MemoryOpenDataStore();
    const { calls, fetchers } = fakeFetchers();
    const job = new OpenDataJob(store, fetchers, openDatabase(':memory:'), log, {
      pauseMs: 0,
      now: () => now,
    });
    const updated: number[] = [];
    job.onWeather = (station) => updated.push(station);
    await job.tick();
    calls.length = 0;
    job.useStation(380);
    await job.tick();
    expect(calls.filter((c) => c.startsWith('knmi 380'))).toHaveLength(21);
    expect(job.stations()).toEqual([260, 380]);
    expect(updated).toContain(380);
  });

  it('waits an hour after a failed request', async () => {
    let time = now.getTime();
    const { fetchers } = fakeFetchers();
    let failures = 0;
    const failing: OpenDataFetchers = {
      ...fetchers,
      knmi: () => {
        failures++;
        return Promise.reject(new Error('down'));
      },
    };
    const job = new OpenDataJob(new MemoryOpenDataStore(), failing, openDatabase(':memory:'), log, {
      pauseMs: 0,
      now: () => new Date(time),
    });
    await job.tick();
    expect(failures).toBe(21);
    expect(job.status().weather).toBe('backoff');
    await job.tick();
    expect(failures).toBe(21);
    time += 4 * HOUR_MS;
    await job.tick();
    expect(failures).toBe(42);
  });
});
