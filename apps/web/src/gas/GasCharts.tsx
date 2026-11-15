import type { GasAnalysis, GasHourly, GasPeriodKind, GasPeriodResponse } from '@p1/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatM3 } from '../format';
import { dateFormat } from '../i18n/dates';
import { css, useEChart } from '../live/useEChart';
import {
  dayProfileOption,
  perDegreeDayOption,
  scatterOption,
  temperatureCurveOption,
  type GasChartTheme,
} from './gasChartOption';

const theme = (): GasChartTheme => ({
  gasColor: css('--app-data-gas'),
  coldColor: css('--app-data-import'),
  textColor: css('--ion-text-color'),
  mutedColor: css('--app-text-muted'),
  surfaceColor: css('--app-surface'),
  fontFamily: css('--ion-font-family'),
});

const noon = (day: string) => new Date(`${day}T12:00:00`);
const m3PerDd = (v: number) => `${v.toLocaleString('nl-NL', { maximumFractionDigits: 3 })} m³`;
const m3 = (v: number) => `${formatM3(v)} m³`;

function usePeriodText(periods: GasPeriodResponse[], kind: GasPeriodKind) {
  const { t } = useTranslation();
  const month = dateFormat({ month: 'short', year: '2-digit' });
  const monthLong = dateFormat({ month: 'long', year: 'numeric' });
  const label = (p: GasPeriodResponse) => {
    if (kind === 'year') return p.key;
    if (kind === 'month') return month.format(noon(p.start));
    return t('gas.weekShort', { week: Number(p.key.slice(6)) });
  };
  const title = (p: GasPeriodResponse) => {
    if (kind === 'year') return p.key;
    if (kind === 'month') return monthLong.format(noon(p.start));
    return t('gas.weekLong', { week: Number(p.key.slice(6)), year: p.key.slice(0, 4) });
  };
  return { labels: periods.map(label), titles: periods.map(title) };
}

/** Heating gas per degree day per week, month or year. */
export function PerDegreeDayChart({
  periods,
  kind,
}: {
  periods: GasPeriodResponse[];
  kind: GasPeriodKind;
}) {
  const { t } = useTranslation();
  const { labels, titles } = usePeriodText(periods, kind);
  const build = useCallback(
    () =>
      perDegreeDayOption(periods, labels, theme(), {
        perDd: t('gas.perDd'),
        trend: t('gas.trend'),
        format: m3PerDd,
        title: (i) => titles[i] ?? '',
      }),
    // labels and titles follow periods, kind and the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periods, kind, t],
  );
  const ref = useEChart(build);
  return <div ref={ref} className="history-chart" role="img" aria-label={t('gas.perDdChart')} />;
}

/** Daily gas against degree days with the heating line. */
export function HeatingLineChart({ analysis }: { analysis: GasAnalysis }) {
  const { t } = useTranslation();
  const build = useCallback(
    () =>
      scatterOption(analysis, theme(), {
        dd: t('gas.degreeDays'),
        m3: t('gas.gasPerDay'),
        line: t('gas.line'),
        format: m3,
        date: (day) => dateFormat({ dateStyle: 'medium' }).format(noon(day)),
      }),
    [analysis, t],
  );
  const ref = useEChart(build);
  return <div ref={ref} className="history-chart" role="img" aria-label={t('gas.lineChart')} />;
}

export function TemperatureCurveChart({ hourly }: { hourly: GasHourly }) {
  const { t } = useTranslation();
  const build = useCallback(
    () =>
      temperatureCurveOption(hourly, theme(), {
        temperature: t('gas.outdoorTemperature'),
        m3: t('gas.gasPerHour'),
        format: m3,
        hours: (n) => t('gas.hoursMeasured', { count: n }),
      }),
    [hourly, t],
  );
  const ref = useEChart(build);
  return <div ref={ref} className="history-chart" role="img" aria-label={t('gas.curveChart')} />;
}

export function DayProfileChart({ hourly }: { hourly: GasHourly }) {
  const { t } = useTranslation();
  const build = useCallback(
    () =>
      dayProfileOption(hourly, theme(), {
        cold: t('gas.coldDays'),
        mild: t('gas.mildDays'),
        format: m3,
      }),
    [hourly, t],
  );
  const ref = useEChart(build);
  return <div ref={ref} className="history-chart" role="img" aria-label={t('gas.profileChart')} />;
}
