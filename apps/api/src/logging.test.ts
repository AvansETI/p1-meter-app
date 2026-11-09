import { describe, expect, it } from 'vitest';
import { maskSignatures } from './logging';

const SIG = '2019-ETI-EMON-V01-A1B2C3-0F0F0F';

describe('maskSignatures', () => {
  it('masks signatures in strings and nested objects', () => {
    const masked = maskSignatures({
      msg: `lookup for ${SIG} failed`,
      nested: { list: [SIG], n: 3 },
    });
    expect(JSON.stringify(masked)).not.toContain('A1B2C3');
    expect(masked.msg).toBe('lookup for 2019-ETI-EMON-V01-…-0F0F failed');
    expect(masked.nested.n).toBe(3);
  });

  it('leaves non-plain objects alone', () => {
    const error = new Error('x');
    expect(maskSignatures({ err: error }).err).toBe(error);
  });
});

describe('loggerOptions', () => {
  it('writes no full signature to the log output', async () => {
    const { pino } = await import('pino');
    const { loggerOptions } = await import('./logging');
    const { loadConfig } = await import('./config');
    const lines: string[] = [];
    const options = loggerOptions(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'info' }));
    const logger = pino(options as object, { write: (line: string) => lines.push(line) });
    logger.info({ signature: SIG }, `opened session for ${SIG}`);
    expect(lines.join('')).toContain('…-0F0F');
    expect(lines.join('')).not.toContain('A1B2C3');
  });
});
