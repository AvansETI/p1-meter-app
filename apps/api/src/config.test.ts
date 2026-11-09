import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config';

const influx = {
  INFLUX_URL: 'https://influx.example.test',
  INFLUX_ORG: 'org',
  INFLUX_BUCKET: 'bucket',
  INFLUX_TOKEN: 'token',
};

describe('loadConfig', () => {
  it('applies defaults for missing and empty values', () => {
    const config = loadConfig({ ...influx, API_PORT: '', API_HOST: '' });
    expect(config).toMatchObject({
      NODE_ENV: 'development',
      API_HOST: '127.0.0.1',
      API_PORT: 3000,
      LOG_LEVEL: 'info',
      TRUST_PROXY: false,
      SESSION_TTL_HOURS: 24,
      FAILED_LOOKUPS_PER_HOUR: 5,
    });
    expect(config.WEB_DIST).toMatch(/apps[/\\]web[/\\]dist$/);
  });

  it('coerces numbers', () => {
    expect(loadConfig({ ...influx, API_PORT: '8080' }).API_PORT).toBe(8080);
  });

  it.each([
    ['true', true],
    ['false', false],
    ['1', 1],
    ['127.0.0.1,10.0.0.0/8', '127.0.0.1,10.0.0.0/8'],
  ])('parses TRUST_PROXY=%j', (value, expected) => {
    expect(loadConfig({ ...influx, TRUST_PROXY: value }).TRUST_PROXY).toEqual(expected);
  });

  it('requires InfluxDB settings outside tests', () => {
    expect(() => loadConfig({})).toThrow(/INFLUX_URL[\s\S]*INFLUX_TOKEN/);
    expect(() => loadConfig({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('reports every invalid variable', () => {
    const load = () => loadConfig({ ...influx, API_PORT: '99999', LOG_LEVEL: 'loud' });
    expect(load).toThrow(ConfigError);
    expect(load).toThrow(/API_PORT[\s\S]*LOG_LEVEL/);
  });
});
