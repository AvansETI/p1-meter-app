import {
  addDays,
  formatPlainDate,
  periodOn,
  weekday,
  type PlainDate,
  type TariffPeriod,
} from '@p1/shared';
import { zonedDate } from '../time';

/**
 * Cost rules as pure functions (docs/design/2026-11-09-costs.md §3). Amounts in euros; prices
 * from the price bucket are excluding VAT and energy tax, tariff amounts as entered by the user.
 */

/** Net metering ("salderingsregeling") applies up to and including this year. */
export const LAST_NET_METERING_YEAR = 2026;

export interface QuarterUsage {
  /** Start of the quarter hour (ms). */
  start: number;
  importKwh: number;
  exportKwh: number;
  /** Day-ahead price in EUR/kWh excl. VAT; undefined when not (yet) known. */
  price?: number;
}

export interface DayUsage {
  date: PlainDate;
  /** Every quarter hour of the local day (92, 96 or 100); null when usage is unknown. */
  quarters: Array<QuarterUsage | null>;
  /** Gas used that day; null when unknown, undefined for households without gas. */
  gasM3?: number | null;
  /** Gas per quarter hour (for hour buckets); null where unknown. */
  gasQuarters?: Array<number | null>;
  /** Mean gas day price in EUR/m³ excl. VAT and energy tax. */
  gasPrice?: number;
  /** Usage includes values spread over a gap in the data. */
  estimated: boolean;
}

/** Running year balance of import − export (kWh), in total and per band (double tariffs). */
export interface Balance {
  year: number;
  total: number;
  normal: number;
  offPeak: number;
}

export const emptyBalance = (year: number): Balance => ({ year, total: 0, normal: 0, offPeak: 0 });

export interface DayCost {
  electricityEur: number;
  gasEur: number;
  fixedEur: number;
  /** Tax reduction ("heffingskorting") for the day, as a positive amount. */
  taxReductionEur: number;
  /** electricity + gas + fixed − tax reduction. */
  totalEur: number;
  estimated: boolean;
}

/** Why a day has no cost: no tariff period yet, a missing price, or unknown usage. */
export type Unknown = 'no-tariff' | 'no-price' | 'no-usage';

export interface DayResult {
  cost: DayCost | Unknown;
  /** Balance after this day; usage counts even when the cost is unknown. */
  balance: Balance;
  /** Electricity cost per quarter hour (for hour buckets); empty when the cost is unknown. */
  quarterEur: number[];
}

const pos = (x: number) => Math.max(0, x);
const neg = (x: number) => Math.max(0, -x);

/**
 * Cost of moving a running balance from `before` to `after` under net metering: kWh that keep
 * the year balance positive cost `price`; kWh that make it negative (surplus export) earn
 * `compensation`. Summed over a year this gives price × max(0, I − E) − compensation × max(0, E − I).
 */
const netted = (before: number, after: number, price: number, compensation: number) =>
  price * (pos(after) - pos(before)) - compensation * (neg(after) - neg(before));

const offPeakFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Amsterdam',
  hourCycle: 'h23',
  hour: '2-digit',
});

/** Off-peak band: Monday–Friday 23:00–07:00 and all of Saturday and Sunday, local time (§3.1). */
export function isOffPeak(start: number): boolean {
  const date = zonedDate(new Date(start));
  if (weekday(date) >= 5) return true;
  const hour = Number(offPeakFormat.format(new Date(start)));
  return hour >= 23 || hour < 7;
}

const daysInMonth = ({ year, month }: PlainDate) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const daysInYear = (year: number) => (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
const isLastDayOfYear = (date: PlainDate) => addDays(date, 1).year !== date.year;

/** Electricity cost of one day per quarter hour; undefined when a needed price is missing. */
function electricity(
  usage: DayUsage,
  period: TariffPeriod,
  start: Balance,
): { quarterEur: number[]; balance: Balance } | undefined {
  const netMetering = usage.date.year <= LAST_NET_METERING_YEAR;
  const e = period.electricity;
  const { compensationPerKwh: compensation, feePerKwh: fee } = period.export;
  const exportMarkup = period.export.dynamicMarkupPerKwh ?? 0;
  const balance = { ...start };
  const quarterEur: number[] = [];

  for (const q of usage.quarters) {
    if (!q) {
      quarterEur.push(0);
      continue;
    }
    const net = q.importKwh - q.exportKwh;
    const offPeak = isOffPeak(q.start);
    const band = offPeak ? 'offPeak' : 'normal';
    const before = { total: balance.total, band: balance[band] };
    balance.total += net;
    balance[band] += net;

    let cost: number;
    if (e.type === 'dynamic') {
      if (q.price === undefined) {
        if (q.importKwh === 0 && q.exportKwh === 0) {
          quarterEur.push(0);
          continue;
        }
        return undefined;
      }
      const vat = 1 + e.vatPercent / 100;
      const supply = q.importKwh * (q.price + e.markupPerKwh);
      const earned = q.exportKwh * (q.price + exportMarkup);
      cost = netMetering
        ? // Supply is settled per quarter; energy tax (and VAT) only on the year's net import.
          (supply - earned + e.energyTaxPerKwh * (pos(balance.total) - pos(before.total))) * vat
        : q.importKwh * (q.price + e.markupPerKwh + e.energyTaxPerKwh) * vat - earned;
    } else {
      const price = e.type === 'single' ? e.perKwh : offPeak ? e.offPeakPerKwh : e.normalPerKwh;
      if (!netMetering) cost = q.importKwh * price - q.exportKwh * compensation;
      else if (e.type === 'single') cost = netted(before.total, balance.total, price, compensation);
      else cost = netted(before.band, balance[band], price, compensation);
    }
    quarterEur.push(cost + q.exportKwh * fee);
  }

  // Double tariff: at the end of the year a surplus in one band nets against the other band's
  // net import (§3.4). Booked on 31 December, so the days still add up to the year.
  if (netMetering && e.type === 'double' && isLastDayOfYear(usage.date) && quarterEur.length) {
    const { normal, offPeak } = balance;
    let correction = 0;
    if (normal < 0 && offPeak > 0) {
      correction = Math.min(-normal, offPeak) * (compensation - e.offPeakPerKwh);
    } else if (offPeak < 0 && normal > 0) {
      correction = Math.min(-offPeak, normal) * (compensation - e.normalPerKwh);
    }
    quarterEur[quarterEur.length - 1]! += correction;
  }
  return { quarterEur, balance };
}

/** Advances the balance with a day's usage without pricing it. */
function advance(usage: DayUsage, start: Balance): Balance {
  const balance = { ...start };
  for (const q of usage.quarters) {
    if (!q) continue;
    const net = q.importKwh - q.exportKwh;
    balance.total += net;
    balance[isOffPeak(q.start) ? 'offPeak' : 'normal'] += net;
  }
  return balance;
}

/** Cost of one local day for one tariff profile, continuing the running year balance. */
export function dayCost(usage: DayUsage, periods: TariffPeriod[], previous: Balance): DayResult {
  // Net metering is settled per calendar year.
  const start = previous.year === usage.date.year ? previous : emptyBalance(usage.date.year);
  const unknown = (reason: Unknown): DayResult => ({
    cost: reason,
    balance: advance(usage, start),
    quarterEur: [],
  });

  const period = periodOn(periods, formatPlainDate(usage.date));
  if (!period) return unknown('no-tariff');
  if (usage.quarters.every((q) => q === null) || usage.gasM3 === null) {
    return unknown('no-usage');
  }

  const power = electricity(usage, period, start);
  if (!power) return unknown('no-price');

  let gasEur = 0;
  const gasM3 = usage.gasM3 ?? 0;
  if (gasM3 > 0 && period.gas) {
    const g = period.gas;
    if (g.type === 'fixed') gasEur = gasM3 * g.perM3;
    else if (usage.gasPrice === undefined) return unknown('no-price');
    else
      gasEur =
        gasM3 * (usage.gasPrice + g.markupPerM3 + g.energyTaxPerM3) * (1 + g.vatPercent / 100);
  }

  const fixedEur =
    (period.fixed.supplierPerMonth + period.fixed.gridPerMonth) / daysInMonth(usage.date);
  const taxReductionEur = period.taxReductionPerYear / daysInYear(usage.date.year);
  const electricityEur = power.quarterEur.reduce((a, b) => a + b, 0);
  return {
    cost: {
      electricityEur,
      gasEur,
      fixedEur,
      taxReductionEur,
      totalEur: electricityEur + gasEur + fixedEur - taxReductionEur,
      // Quarters without data (null) also make the day an estimate.
      estimated: usage.estimated || usage.quarters.some((q) => q === null),
    },
    balance: power.balance,
    quarterEur: power.quarterEur,
  };
}
