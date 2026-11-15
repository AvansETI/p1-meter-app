import {
  addDays,
  formatPlainDate,
  parsePlainDate,
  type Capabilities,
  type GasAnalysis,
  type GasComparison,
  type GasHourly,
} from '@p1/shared';
import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../config';
import { openDatabase } from '../db/database';
import { FakeDataSource } from '../data/fake';
import type { GasDayEnd } from '../data/source';
import { OpenDataJob } from '../opendata/job';
import { MemoryOpenDataStore } from '../opendata/store';
import { buildServer } from '../server';
import { zonedToUtc } from '../time';
import { dailyGas, mergeDays, readDayEnds } from './days';
import { distribution, GasService } from './service';
import { WeatherService } from './weather';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const NO_GAS = '2019-ETI-EMON-V01-A1B2C3-000001';
const HOUR_MS = 3_600_000;
const CAPS: Capabilities = {
  hasGas: true,
  hasExport: false,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-14T10:00:00Z',
};
const NOW = new Date('2026-11-15T12:00:00Z');

const day = (offset: number, from = '2025-11-01') =>
  formatPlainDate(addDays(parsePlainDate(from)!, offset));
const midnight = (d: string) => zonedToUtc(parsePlainDate(d)!).getTime();
/** Temperature on day i: cold in winter, warm in summer. */
const temperature = (i: number) => 10 - 9 * Math.cos((2 * Math.PI * (i + 60)) / 365);

/** Daily counter readings ten minutes before midnight; gas = 1 + 0.3 × plain degree days. */
function dayEnds(count: number): GasDayEnd[] {
  let value = 1000;
  return Array.from({ length: count }, (_, i) => {
    const d = day(i);
    value += 1 + 0.3 * Math.max(0, 18 - temperature(i));
    const dayEnd = midnight(day(i + 1));
    return { day: d, time: dayEnd - 10 * 60_000, dayEnd, value };
  });
}

/** Hourly weather for station 260 matching `temperature`, from the start of the gas data. */
async function weatherStore() {
  const store = new MemoryOpenDataStore();
  const hours = [];
  for (let t = Date.parse('2025-10-31T00:00Z'); t <= NOW.getTime(); t += HOUR_MS) {
    const i = Math.floor((t - midnight('2025-11-01')) / 86_400_000);
    hours.push({ time: new Date(t), t: temperature(i), fh: 3 });
  }
  await store.writeWeather(260, hours);
  const normal = [];
  for (let t = Date.UTC(2006, 0, 1); t < Date.UTC(2026, 0, 1); t += 86_400_000) {
    const i = Math.floor((t - midnight('2025-11-01')) / 86_400_000);
    normal.push({ day: new Date(t).toISOString().slice(0, 10), t: temperature(i), fh: 3 });
  }
  await store.writeNormalDays(260, normal);
  return store;
}

describe('dailyGas', () => {
  it('takes differences between consecutive days with readings near midnight', () => {
    const ends = dayEnds(5);
    const gas = dailyGas(ends);
    expect([...gas.keys()]).toEqual([day(1), day(2), day(3), day(4)]);
    expect(gas.get(day(1))).toBeCloseTo(ends[1]!.value - ends[0]!.value);
  });

  it('leaves out days around a gap or a late reading', () => {
    const ends = dayEnds(7);
    ends.splice(2, 1); // no reading on day 2
    ends[3] = { ...ends[3]!, time: ends[3]!.dayEnd - 2 * HOUR_MS }; // day 4 read at 22:00
    expect([...dailyGas(ends).keys()]).toEqual([day(1), day(6)]);
  });

  it('ignores negative or impossible jumps', () => {
    const ends = dayEnds(3);
    ends[2] = { ...ends[2]!, value: ends[1]!.value - 1 };
    expect(dailyGas(ends).has(day(2))).toBe(false);
  });
});

describe('readDayEnds', () => {
  it('reads in chunks and keeps one reading per day', async () => {
    const ends = dayEnds(400);
    const source = new FakeDataSource({ [SIG]: { capabilities: CAPS, gasDays: ends } });
    const calls: Array<[Date, Date | undefined]> = [];
    const original = source.gasDayEnds.bind(source);
    source.gasDayEnds = (signature, from, to) => {
      calls.push([from, to]);
      return original(signature, from, to);
    };
    const result = await readDayEnds(
      source,
      SIG,
      new Date(midnight(day(0))),
      new Date(midnight(day(400))),
    );
    expect(calls).toHaveLength(5);
    expect(result).toHaveLength(400);
    expect(result.map((e) => e.day)).toEqual(ends.map((e) => e.day));
  });
});

describe('mergeDays', () => {
  it('leaves out days without any gas (nobody home)', () => {
    const gas = new Map([
      ['2026-01-01', 3],
      ['2026-01-02', 0],
    ]);
    const days = mergeDays(gas, new Map(), '2026-01-01', '2026-01-03');
    expect(days.map((d) => d.m3)).toEqual([3, null, null]);
  });
});

describe('distribution', () => {
  it('returns rounded quantiles and the household percentile from 5 households', () => {
    expect(distribution([800, 900, 1000, 1100], 900)).toBeNull();
    expect(distribution([800, 900, 1000, 1100, 1204], 1000)).toEqual({
      n: 5,
      percentile: 50,
      p10: 840,
      p25: 900,
      p50: 1000,
      p75: 1100,
      p90: 1160,
    });
  });
});

describe('GasService comparison', () => {
  it('compares within the narrowest shared group of at least 5 households', async () => {
    const db = openDatabase(':memory:');
    const hash = (s: string) => `h-${s}`;
    const store = new MemoryOpenDataStore();
    const job = new OpenDataJob(store, undefined as never, db, pino({ level: 'silent' }));
    const service = new GasService(
      new FakeDataSource(),
      new WeatherService(store),
      store,
      job,
      db,
      hash,
      () => NOW,
    );
    const insert = db.prepare(
      "INSERT INTO gas_reference (hash, annual_m3, updated_day) VALUES (?, ?, '2026-11-15')",
    );
    for (let i = 0; i < 8; i++) {
      insert.run(hash(`s${i}`), 800 + i * 100);
      // Five terraced houses, three apartments; only two terraced with solar.
      service.shareProfile(
        `s${i}`,
        i < 5 ? { type: 'terraced', solar: i < 2 } : { type: 'apartment' },
      );
    }
    insert.run(hash('old'), 5000);
    db.prepare("UPDATE gas_reference SET updated_day = '2026-10-01' WHERE hash = 'h-old'").run();

    const result = await service.comparison('s0', {});
    expect(result.own).toBe(800);
    expect(result.shared).toBe(true);
    expect(result.all!.n).toBe(8);
    expect(result.group).toMatchObject({ n: 5, profile: { type: 'terraced' }, percentile: 10 });
    expect(result.cbs).toBeNull();

    service.unshareProfile('s0');
    expect((await service.comparison('s0', {})).group).toBeNull();
  });
});

describe('GasService storage', () => {
  function service(db: ReturnType<typeof openDatabase>, source: FakeDataSource) {
    const store = new MemoryOpenDataStore();
    const job = new OpenDataJob(store, undefined as never, db, pino({ level: 'silent' }));
    return new GasService(
      source,
      new WeatherService(store),
      store,
      job,
      db,
      (s) => `h-${s}`,
      () => NOW,
    );
  }

  it('keeps daily readings across restarts and then reads only the newest days', async () => {
    const db = openDatabase(':memory:');
    const source = new FakeDataSource({
      [SIG]: { capabilities: CAPS, gasDays: dayEnds(380), firstPoint: new Date('2025-11-01') },
    });
    const first = await service(db, source).gasDays(SIG);
    const calls: Date[] = [];
    const original = source.gasDayEnds.bind(source);
    source.gasDayEnds = (signature, from, to) => {
      calls.push(from);
      return original(signature, from, to);
    };
    const again = await service(db, source).gasDays(SIG);
    expect([...again]).toEqual([...first]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.getTime()).toBeGreaterThan(NOW.getTime() - 20 * 86_400_000);
  });

  it('stores the postcode region and derives the station from it', () => {
    const db = openDatabase(':memory:');
    const gas = service(db, new FakeDataSource());
    expect(gas.stationOf(SIG)).toBeUndefined();
    gas.setPostcode(SIG, '62');
    expect(gas.stationOf(SIG)).toBe(380);
    gas.setPostcode(SIG, undefined);
    expect(gas.stationOf(SIG)).toBeUndefined();
  });
});

describe('gas routes', () => {
  afterEach(() => vi.useRealTimers());

  async function setup() {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const source = new FakeDataSource({
      [SIG]: { capabilities: CAPS, gasDays: dayEnds(380), firstPoint: new Date('2025-11-01') },
      [NO_GAS]: { ...CAPS, hasGas: false },
    });
    const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }), {
      source,
      openData: await weatherStore(),
    });
    const open = async (emonId: string) =>
      (await app.inject({ method: 'POST', url: '/api/v1/session', payload: { emonId } })).json<{
        sessionId: string;
      }>().sessionId;
    const get = async (session: string, url: string) =>
      app.inject({ method: 'GET', url, headers: { 'x-session': session } });
    return { app, open, get };
  }

  it('analyses gas against degree days', async () => {
    const { app, open, get } = await setup();
    const session = await open(SIG);
    const res = await get(
      session,
      '/api/v1/gas/analysis?station=260&base=18&method=plain&cooking=true',
    );
    expect(res.statusCode).toBe(200);
    const body = res.json<GasAnalysis>();
    expect(body.station).toBe(260);
    expect(body.days.at(-1)!.day).toBe('2026-11-14');
    expect(body.baseline.source).toBe('auto');
    expect(body.baseline.value).toBeCloseTo(1, 1);
    expect(body.line!.slope).toBeCloseTo(0.3, 2);
    expect(body.periods.month.length).toBeGreaterThan(10);
    expect(body.forecast!.year).toBe(2026);
    expect(body.normal.years).toBe(20);
    expect(body.years.map((y) => y.year)).toEqual([2025, 2026]);

    const off = await get(
      session,
      '/api/v1/gas/analysis?station=260&base=18&method=weighted&cooking=false&postcode=35',
    );
    expect(off.json<GasAnalysis>().baseline).toMatchObject({ value: 0, source: 'off' });
    await app.close();
  });

  it('validates the query and needs gas', async () => {
    const { app, open, get } = await setup();
    const session = await open(SIG);
    for (const query of [
      'station=999&base=18&method=plain&cooking=true',
      'station=260&base=25&method=plain&cooking=true',
      'station=260&base=18&method=other&cooking=true',
      'station=260&base=18&method=plain&cooking=true&postcode=3511',
    ]) {
      expect((await get(session, `/api/v1/gas/analysis?${query}`)).statusCode).toBe(400);
    }
    const noGas = await open(NO_GAS);
    expect((await get(noGas, '/api/v1/gas/hourly?station=260')).statusCode).toBe(404);
    expect((await get('nope', '/api/v1/gas/hourly?station=260')).statusCode).toBe(401);
    await app.close();
  });

  it('returns the hourly analysis', async () => {
    const { app, open, get } = await setup();
    const res = await get(await open(SIG), '/api/v1/gas/hourly?station=260');
    expect(res.statusCode).toBe(200);
    expect(res.json<GasHourly>()).toMatchObject({ hourlyUpdates: false, curve: [] });
    await app.close();
  });

  it('shares and withdraws the profile', async () => {
    const { app, open, get } = await setup();
    const session = await open(SIG);
    const put = (payload: Record<string, unknown>) =>
      app.inject({
        method: 'PUT',
        url: '/api/v1/gas/profile',
        headers: { 'x-session': session },
        payload,
      });
    expect((await put({ type: 'castle' })).statusCode).toBe(400);
    expect((await put({ type: 'terraced', solar: true })).statusCode).toBe(204);
    const comparison = async () =>
      (await get(session, '/api/v1/gas/comparison?type=terraced')).json<GasComparison>();
    expect(await comparison()).toMatchObject({ shared: true, all: null, group: null });
    const del = await app.inject({
      method: 'DELETE',
      url: '/api/v1/gas/profile',
      headers: { 'x-session': session },
    });
    expect(del.statusCode).toBe(204);
    expect((await comparison()).shared).toBe(false);
    await app.close();
  });
});
