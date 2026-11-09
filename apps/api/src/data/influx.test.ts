import { describe, expect, it } from 'vitest';
import { describeError } from './influx';

describe('describeError', () => {
  it('includes HTTP status and message', () => {
    const error = Object.assign(new Error('unauthorized access'), {
      name: 'HttpError',
      statusCode: 401,
    });
    expect(describeError(error)).toBe('HttpError — HTTP 401 — unauthorized access');
  });

  it('includes the network cause', () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED 10.0.0.9:8086'), {
      code: 'ECONNREFUSED',
    });
    const error = new Error('fetch failed', { cause });
    expect(describeError(error)).toBe(
      'Error — fetch failed — cause: ECONNREFUSED connect ECONNREFUSED 10.0.0.9:8086',
    );
  });
});
