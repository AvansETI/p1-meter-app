import {
  IonButton,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { GasAnalysis, GasComparison, GasPeriodKind } from '@p1/shared';
import { lazy, Suspense, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import ToolbarLogo from '../components/ToolbarLogo';
import { dateFormat } from '../i18n/dates';
import FestiveDecoration from '../festive/FestiveDecoration';
import Comparison from '../gas/Comparison';
import { useGasAnalysis, useGasComparison, useGasHourly } from '../gas/queries';
import { stationOf } from '../gas/station';
import { useSession } from '../session/context';
import { useSettings } from '../settings/context';

// ECharts is large; load the charts only when they are shown.
const charts = () => import('../gas/GasCharts');
const PerDegreeDayChart = lazy(() => charts().then((m) => ({ default: m.PerDegreeDayChart })));
const HeatingLineChart = lazy(() => charts().then((m) => ({ default: m.HeatingLineChart })));
const TemperatureCurveChart = lazy(() =>
  charts().then((m) => ({ default: m.TemperatureCurveChart })),
);
const DayProfileChart = lazy(() => charts().then((m) => ({ default: m.DayProfileChart })));

/** Weekly bars are limited to the last year; months and years show everything. */
const MAX_WEEKS = 52;

const whole = (v: number) => Math.round(v).toLocaleString('nl-NL');
const fixed = (v: number, digits: number) =>
  v.toLocaleString('nl-NL', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const chartFallback = <IonSkeletonText animated className="history-chart" />;

function Tile({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit: string;
  note?: string;
}) {
  return (
    <div className="today-item">
      <span className="today-item__label">{label}</span>
      <span className="today-item__value">
        {value}
        <small>{unit}</small>
      </span>
      {note && <span className="history-change history-change--neutral">{note}</span>}
    </div>
  );
}

function Summary({ analysis }: { analysis: GasAnalysis }) {
  const { t } = useTranslation();
  const { forecast, line, baseline, years } = analysis;
  const complete = years.filter((y) => y.complete && y.corrected !== null);
  const last = complete.at(-1);
  const before = complete.at(-2);
  const change =
    last && before && before.corrected ? (last.corrected! / before.corrected - 1) * 100 : null;
  return (
    <div className="today-grid">
      {forecast && (
        <>
          <Tile
            label={t('gas.thisYear', { year: forecast.year })}
            value={whole(forecast.actual)}
            unit="m³"
          />
          <Tile
            label={t('gas.forecast', { year: forecast.year })}
            value={whole(forecast.total)}
            unit="m³"
          />
        </>
      )}
      {last && (
        <Tile
          label={t('gas.correctedYear', { year: last.year })}
          value={whole(last.corrected!)}
          unit="m³"
          note={
            change === null
              ? undefined
              : t('gas.changeVsYear', {
                  change: `${change > 0 ? '+' : '−'}${fixed(Math.abs(change), 0)}%`,
                  year: before!.year,
                })
          }
        />
      )}
      {line && (
        <Tile label={t('gas.slope')} value={fixed(line.slope, 3)} unit={t('gas.perDdUnit')} />
      )}
      <Tile
        label={t('gas.baseline')}
        value={fixed(baseline.value, 2)}
        unit={t('gas.perDayUnit')}
        note={t(`gas.baselineSource.${baseline.source}`)}
      />
    </div>
  );
}

function Years({ analysis, comparison }: { analysis: GasAnalysis; comparison?: GasComparison }) {
  const { t } = useTranslation();
  const cbs = new Map(comparison?.cbs?.medians.map((m) => [m.year, m.p50]));
  return (
    <table className="gas-years">
      <thead>
        <tr>
          <th>{t('gas.year')}</th>
          <th>{t('gas.actual')}</th>
          <th>{t('gas.degreeDaysShort')}</th>
          <th>{t('gas.corrected')}</th>
          {cbs.size > 0 && <th>{t('gas.cbsMedian')}</th>}
        </tr>
      </thead>
      <tbody>
        {analysis.years.map((y) => (
          <tr key={y.year}>
            <td>
              {y.year}
              {!y.complete && <small> {t('gas.incompleteYear', { days: y.days })}</small>}
            </td>
            <td>{whole(y.m3)}</td>
            <td>{whole(y.dd)}</td>
            <td>{y.corrected === null ? '—' : whole(y.corrected)}</td>
            {cbs.size > 0 && <td>{cbs.has(y.year) ? whole(cbs.get(y.year)!) : '—'}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function GasPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { state } = useSession();
  const [kind, setKind] = useState<GasPeriodKind>('month');
  const ready = state.status === 'ready' && state.capabilities.hasGas;
  const { gas, emonId } = settings;
  const { station, located } = stationOf(gas);
  const analysis = useGasAnalysis(emonId, gas, ready);
  const hourly = useGasHourly(emonId, gas, ready);
  const comparison = useGasComparison(emonId, gas.profile, ready);
  // While the station's weather is still being fetched the analysis is meaningless.
  const data = analysis.data?.pending ? undefined : analysis.data;
  const periods = data
    ? kind === 'week'
      ? data.periods.week.slice(-MAX_WEEKS)
      : data.periods[kind]
    : [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('gas.title')}</IonTitle>
          <ToolbarLogo />
        </IonToolbar>
        <FestiveDecoration />
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="history gas">
          <p className="history-hint">
            {t('gas.station', { name: station.name })}
            {analysis.data?.weatherUntil &&
              ` · ${t('gas.weatherUntil', { day: dateFormat({ dateStyle: 'medium' }).format(new Date(`${analysis.data.weatherUntil}T12:00:00`)) })}`}
            {!located && (
              <>
                {' · '}
                <IonButton
                  fill="clear"
                  size="small"
                  routerLink="/settings/gas"
                  className="gas-link"
                >
                  {t('gas.setLocation')}
                </IonButton>
              </>
            )}
          </p>
          {analysis.data?.pending && (
            <p className="offline-notice">{t('gas.pending', { name: station.name })}</p>
          )}
          {analysis.isError && <p className="live__error">{t('gas.unavailable')}</p>}
          {(analysis.isPending || analysis.data?.pending) && (
            <IonSkeletonText animated className="today-grid--skeleton" />
          )}
          {data && <Summary analysis={data} />}

          {data && (
            <div className="history-charts">
              <section>
                <h2 className="live__heading">{t('gas.perDdTitle')}</h2>
                <IonSegment
                  value={kind}
                  onIonChange={(e) => setKind(e.detail.value as GasPeriodKind)}
                  className="gas-segment"
                >
                  <IonSegmentButton value="week">
                    <IonLabel>{t('gas.week')}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="month">
                    <IonLabel>{t('gas.month')}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="year">
                    <IonLabel>{t('gas.yearTab')}</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
                <Suspense fallback={chartFallback}>
                  <PerDegreeDayChart periods={periods} kind={kind} />
                </Suspense>
                <p className="history-hint">{t('gas.perDdHint')}</p>
              </section>
              <section>
                <h2 className="live__heading">{t('gas.lineTitle')}</h2>
                <Suspense fallback={chartFallback}>
                  <HeatingLineChart analysis={data} />
                </Suspense>
                <p className="history-hint">
                  {data.line
                    ? t('gas.lineHint', {
                        slope: fixed(data.line.slope, 3),
                        base: fixed(Math.max(0, data.line.intercept), 2),
                        r2: fixed(data.line.r2, 2),
                        days: data.line.n,
                      })
                    : t('gas.lineTooFew')}
                </p>
              </section>
              <section>
                <h2 className="live__heading">{t('gas.yearsTitle')}</h2>
                <Years analysis={data} comparison={comparison.data} />
                <p className="history-hint">
                  {t('gas.yearsHint', {
                    normal: whole(data.normal.annual),
                    years: data.normal.years,
                  })}
                </p>
              </section>
              {hourly.data && hourly.data.curve.length > 0 && (
                <section>
                  <h2 className="live__heading">{t('gas.hourlyTitle')}</h2>
                  <Suspense fallback={chartFallback}>
                    <TemperatureCurveChart hourly={hourly.data} />
                  </Suspense>
                  <Suspense fallback={chartFallback}>
                    <DayProfileChart hourly={hourly.data} />
                  </Suspense>
                  <p className="gas-legend">
                    <span style={{ '--marker': 'var(--app-data-import)' } as CSSProperties}>
                      {t('gas.coldDays')}
                    </span>
                    <span style={{ '--marker': 'var(--app-data-gas)' } as CSSProperties}>
                      {t('gas.mildDays')}
                    </span>
                  </p>
                  <p className="history-hint">
                    {t('gas.hourlyHint')}
                    {hourly.data.hourlyUpdates && ` ${t('gas.hourlyShifted')}`}
                  </p>
                </section>
              )}
              <section>
                <h2 className="live__heading">{t('gas.compareTitle')}</h2>
                {comparison.data ? (
                  <Comparison comparison={comparison.data} profile={gas.profile} />
                ) : comparison.isError ? (
                  <p className="live__error">{t('gas.unavailable')}</p>
                ) : (
                  <IonSkeletonText animated className="today-grid--skeleton" />
                )}
                {Object.keys(gas.profile).length === 0 && (
                  <IonButton fill="outline" size="small" routerLink="/settings/gas">
                    {t('gas.fillProfile')}
                  </IonButton>
                )}
              </section>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
