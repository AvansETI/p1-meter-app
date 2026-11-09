import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isHealthResponse } from '@p1/shared';
import { loadConfig } from './config';
import { FakeDataSource } from './data/fake';
import { buildServer } from './server';

// Dummy settings: production mode requires them, but tests use a fake data source.
const influx = {
  INFLUX_URL: 'https://influx.example.test',
  INFLUX_ORG: 'org',
  INFLUX_BUCKET: 'bucket',
  INFLUX_TOKEN: 'token',
};

describe('GET /api/v1/health', () => {
  it('returns ok with version and uptime', async () => {
    const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(isHealthResponse(res.json())).toBe(true);
    await app.close();
  });
});

describe('production static serving', () => {
  let dist: string;

  beforeAll(async () => {
    dist = await mkdtemp(path.join(tmpdir(), 'p1-web-dist-'));
    await mkdir(path.join(dist, 'assets'));
    await writeFile(path.join(dist, 'index.html'), '<!doctype html><title>app</title>');
    await writeFile(path.join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');
  });

  afterAll(async () => {
    await rm(dist, { recursive: true, force: true });
  });

  const build = () =>
    buildServer(
      loadConfig({ NODE_ENV: 'production', LOG_LEVEL: 'silent', WEB_DIST: dist, ...influx }),
      { source: new FakeDataSource() },
    );

  it('serves index.html for client-side routes', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/history' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['cache-control']).toBe('no-cache');
    await app.close();
  });

  it('marks hashed assets as immutable', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/assets/app-abc123.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
    await app.close();
  });

  it('keeps a JSON 404 for unknown API routes', async () => {
    const app = await build();
    const res = await app.inject({ method: 'GET', url: '/api/v1/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
    await app.close();
  });
});

describe('security headers', () => {
  it('sets a same-origin CSP without upgrade-insecure-requests', async () => {
    const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('upgrade-insecure-requests');
    await app.close();
  });
});

describe('health with an unreachable InfluxDB', () => {
  it('answers immediately and reports the status of the background check', async () => {
    const source = new FakeDataSource();
    let resolvePing: (ok: boolean) => void = () => undefined;
    source.ping = () => new Promise<boolean>((resolve) => (resolvePing = resolve));
    const app = await buildServer(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }), {
      source,
    });

    const first = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ status: 'ok', influx: 'unknown' });

    resolvePing(false);
    await new Promise((resolve) => setImmediate(resolve));
    const second = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(second.json()).toMatchObject({ influx: 'unavailable' });
    await app.close();
  });
});
