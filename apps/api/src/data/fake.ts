import type { Capabilities } from '@p1/shared';
import {
  UpstreamError,
  type CounterDeltas,
  type CounterField,
  type GasData,
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
  gas?: GasData;
  /** Last counter values per quarter start (ms) for quarterCounters. */
  quarters?: Map<number, Partial<Record<CounterField, number>>>;
  /** Counter values per instant (ms) for countersAt. */
  counters?: Map<number, Partial<Record<CounterField, number>>>;
  firstPoint?: Date;
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

  countersAt(
    signature: string,
    _fields: CounterField[],
    instants: Date[],
  ): Promise<Array<Partial<Record<CounterField, number>>>> {
    return this.run(() =>
      instants.map((instant) => this.households[signature]?.counters?.get(instant.getTime()) ?? {}),
    );
  }

  quarterCounters(
    signature: string,
    fields: CounterField[],
    from: Date,
    to: Date,
  ): Promise<Map<CounterField, Map<number, number>>> {
    return this.run(() => {
      const result = new Map<CounterField, Map<number, number>>(fields.map((f) => [f, new Map()]));
      for (const [time, values] of this.households[signature]?.quarters ?? []) {
        if (time < from.getTime() || time >= to.getTime()) continue;
        for (const field of fields) {
          const value = values[field];
          if (value !== undefined) result.get(field)!.set(time, value);
        }
      }
      return result;
    });
  }

  lastBefore(
    signature: string,
    fields: CounterField[],
    before: Date,
  ): Promise<Map<CounterField, { time: number; value: number }>> {
    return this.run(() => {
      const household = this.households[signature];
      const result = new Map<CounterField, { time: number; value: number }>();
      // Values at exact instants (countersAt) and quarter values, latest first.
      const points = [...(household?.counters ?? []), ...(household?.quarters ?? [])]
        .filter(([time]) => time < before.getTime())
        .sort(([a], [b]) => b - a);
      for (const field of fields) {
        const hit = points.find(([, values]) => values[field] !== undefined);
        if (hit) result.set(field, { time: hit[0], value: hit[1][field]! });
      }
      return result;
    });
  }

  firstPoint(signature: string): Promise<Date | null> {
    return this.run(() => this.households[signature]?.firstPoint ?? null);
  }

  gasHourly(signature: string): Promise<GasData> {
    return this.run(
      () => this.households[signature]?.gas ?? { lastPerHour: new Map(), increaseTimes: [] },
    );
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
