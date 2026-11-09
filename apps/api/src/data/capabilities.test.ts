import type { Capabilities } from '@p1/shared';
import { describe, expect, it, vi } from 'vitest';
import { CapabilityService } from './capabilities';
import { FakeDataSource } from './fake';

const SIG = '2019-ETI-EMON-V01-A1B2C3-000000';
const CAPS: Capabilities = {
  hasGas: true,
  hasExport: false,
  importCounter: 'energy_consumed',
  counterOrientation: 'as-named',
  lastSeen: '2026-11-09T10:00:00Z',
};

describe('CapabilityService', () => {
  it('caches found and not-found results', async () => {
    const source = new FakeDataSource({ [SIG]: CAPS });
    const service = new CapabilityService(source);
    await service.get(SIG);
    await service.get(SIG);
    await service.get('2019-ETI-EMON-V01-FFFFFF-FFFFFF');
    await service.get('2019-ETI-EMON-V01-FFFFFF-FFFFFF');
    expect(source.calls).toBe(2);
  });

  it('shares one query between concurrent lookups', async () => {
    const source = new FakeDataSource({ [SIG]: CAPS });
    const detect = vi.spyOn(source, 'detect');
    const service = new CapabilityService(source);
    const results = await Promise.all([service.get(SIG), service.get(SIG), service.get(SIG)]);
    expect(results).toEqual([CAPS, CAPS, CAPS]);
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const source = new FakeDataSource({ [SIG]: CAPS });
    source.available = false;
    const service = new CapabilityService(source);
    await expect(service.get(SIG)).rejects.toThrow();
    source.available = true;
    await expect(service.get(SIG)).resolves.toEqual(CAPS);
  });
});
