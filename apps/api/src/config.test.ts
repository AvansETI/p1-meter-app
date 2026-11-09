import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config';

describe('loadConfig', () => {
  it('applies defaults for missing and empty values', () => {
    const config = loadConfig({ API_PORT: '', API_HOST: '' });
    expect(config).toMatchObject({
      NODE_ENV: 'development',
      API_HOST: '127.0.0.1',
      API_PORT: 3000,
      LOG_LEVEL: 'info',
    });
    expect(config.WEB_DIST).toMatch(/apps[/\\]web[/\\]dist$/);
  });

  it('coerces the port to a number', () => {
    expect(loadConfig({ API_PORT: '8080' }).API_PORT).toBe(8080);
  });

  it('reports every invalid variable', () => {
    const load = () => loadConfig({ API_PORT: '99999', LOG_LEVEL: 'loud' });
    expect(load).toThrow(ConfigError);
    expect(load).toThrow(/API_PORT[\s\S]*LOG_LEVEL/);
  });
});
