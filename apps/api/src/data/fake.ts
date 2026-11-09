import type { Capabilities } from '@p1/shared';
import {
  UpstreamError,
  type CounterDeltas,
  type CounterField,
  type HouseholdDataSource,
  type PowerPoint,
  type PowerWindow,
} from './source';

export interface FakeHousehold {
  capabilities: Capabilities;
  latest?: PowerPoint;
  lastPoint?: PowerPoint;
  deltas?: CounterDeltas;
  recent?: PowerWindow[];
}

/** In-memory data source for tests and UI work without InfluxDB. */
export class FakeDataSource implements HouseholdDataSource {
  calls = 0;
  latestCalls: string[][] = [];
  available = true;
  readonly households: Record<string, FakeHousehold>;

  constructor(households: Record<string, Capabilities | FakeHousehold> = {}) {
    this.households = Object.fromEntries(
      Object.entries(households).map(([sig, value]) => [
        sig,
        'capabilities' in value ? value : { capabilities: value },
      ]),
    );
  }

  private guard(): void {
    this.calls++;
    if (!this.available) throw new UpstreamError('fake source unavailable');
  }

  detect(signature: string): Promise<Capabilities | null> {
    return this.run(() => this.households[signature]?.capabilities ?? null);
  }

  latest(signatures: string[]): Promise<Map<string, PowerPoint>> {
    this.latestCalls.push(signatures);
    return this.run(() => {
      const result = new Map<string, PowerPoint>();
      for (const sig of signatures) {
        const point = this.households[sig]?.latest;
        if (point) result.set(sig, point);
      }
      return result;
    });
  }

  lastPoint(signature: string): Promise<PowerPoint | null> {
    return this.run(() => {
      const household = this.households[signature];
      return household?.latest ?? household?.lastPoint ?? null;
    });
  }

  counterDeltas(signature: string, _since: Date, fields: CounterField[]): Promise<CounterDeltas> {
    return this.run(() => {
      const deltas = this.households[signature]?.deltas ?? {};
      return Object.fromEntries(fields.flatMap((f) => (f in deltas ? [[f, deltas[f]]] : [])));
    });
  }

  recentPower(signature: string): Promise<PowerWindow[]> {
    return this.run(() => this.households[signature]?.recent ?? []);
  }

  ping(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  private run<T>(fn: () => T): Promise<T> {
    try {
      this.guard();
      return Promise.resolve(fn());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
