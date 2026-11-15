import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  addDays,
  formatPlainDate,
  parsePlainDate,
  type GasAnalysis,
  type GasComparison,
  type GasPeriodKind,
} from '@p1/shared';
import { today } from '../history/dates';
import { lazy, Suspense, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import ToolbarLogo from '../components/ToolbarLogo';
import { dateFormat } from '../i18n/dates';
import FestiveDecoration from '../festive/FestiveDecoration';
import Comparison from '../gas/Comparison';
import { useGasAnalysis, useGasComparison, useGasHourly } from '../gas/queries';
import { stationOf } from '../gas/station';
import { DAYS_PER_MONTH } from '../gas/units';
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

const dayBefore = (day: string) => formatPlainDate(addDays(parsePlainDate(day)!, -1));

/** "1 jan – 14 nov 2026", or "1 apr 2026 – 31 mrt 2027" across years. */
function range(first: string, last: string): string {
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  const short = dateFormat({ day: 'numeric', month: 'short' });
  const long = dateFormat({ day: 'numeric', month: 'short', year: 'numeric' });
  const at = (day: string) => new Date(`${day}T12:00:00`);
  return `${(sameYear ? short : long).format(at(first))} – ${long.format(at(last))}`;
}

const chartFallback = <IonSkeletonText animated className="history-chart" />;

function Tile({
  label,
  value,
  unit,
  note,
  period,
  estimate,
}: {
  label: string;
  value: string;
  unit: string;
  note?: string;
  /** The dates the value covers, e.g. "1 apr 2026 – 31 mrt 2027". */
  period?: string;
  /** How much of the value is estimated over gaps in the readings. */
  estimate?: string;
}) {
  return (
    <div className="today-item">
      <span className="today-item__label">{label}</span>
      {period && <span className="today-item__period">{period}</span>}
      <span className="today-item__value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      {note && <span className="history-change history-change--neutral">{note}</span>}
      {estimate && <span className="today-item__estimate">{estimate}</span>}
    </div>
  );
}

function Summary({ analysis }: { analysis: GasAnalysis }) {
  const { t } = useTranslation();
  const { forecast, line, baseline, rolling, degreeDays, settlement } = analysis;
  const change = rolling?.previous ? (rolling.corrected / rolling.previous - 1) * 100 : null;
  const percent = (value: number, of: number) =>
    `${value >= of ? '+' : '−'}${fixed(Math.abs((value / of - 1) * 100), 0)}%`;
  // The current year in the chosen division (calendar, contract or heating year).
  const startYear = forecast?.year ?? degreeDays?.year ?? new Date().getFullYear();
  const year = {
    first: `${startYear}-${analysis.yearStart}`,
    last: dayBefore(`${startYear + 1}-${analysis.yearStart}`),
  };
  const yesterday = dayBefore(formatPlainDate(today()));
  const estimated = (days: number) =>
    days > 0 ? t('gas.estimatedDays', { count: days }) : undefined;
  return (
    <div className="today-grid">
      {forecast &&
        (settlement && settlement.forecast !== null ? (
          <Tile
            label={t('gas.settlement')}
            period={range(year.first, year.last)}
            value={`${settlement.forecast >= settlement.expected ? '+' : '−'}${whole(
              Math.abs(settlement.forecast - settlement.expected),
            )}`}
            unit="m³"
            note={t(
              settlement.forecast > settlement.expected
                ? 'gas.settlementMore'
                : 'gas.settlementLess',
              {
                forecast: whole(settlement.forecast),
                expected: whole(settlement.expected),
                change: percent(settlement.forecast, settlement.expected),
              },
            )}
          />
        ) : (
          <Tile
            label={t('gas.forecast')}
            period={range(year.first, year.last)}
            value={whole(forecast.total)}
            unit="m³"
          />
        ))}
      {forecast && (
        <Tile
          label={t('gas.usedSoFar')}
          period={range(year.first, yesterday)}
          value={whole(settlement?.soFar?.actual ?? forecast.actual)}
          unit="m³"
          estimate={estimated(settlement?.soFar?.filled ?? forecast.filled)}
          note={
            settlement?.soFar
              ? t('gas.soFarNote', {
                  expected: whole(settlement.soFar.expected),
                  change: percent(settlement.soFar.actual, settlement.soFar.expected),
                })
              : undefined
          }
        />
      )}
      {rolling && (
        <Tile
          label={t('gas.rolling')}
          value={whole(rolling.corrected)}
          unit="m³"
          note={
            change === null
              ? rolling.days < 365
                ? t('gas.rollingDays', { days: rolling.days })
                : undefined
              : t('gas.rollingChange', {
                  change: `${change > 0 ? '+' : '−'}${fixed(Math.abs(change), 0)}%`,
                })
          }
        />
      )}
      {degreeDays && (
        <Tile
          label={t('gas.degreeDaysSoFar')}
          period={range(year.first, analysis.weatherUntil ?? yesterday)}
          value={whole(degreeDays.actual)}
          unit=""
          note={
            degreeDays.normal > 0
              ? t('gas.degreeDaysVsNormal', {
                  normal: whole(degreeDays.normal),
                  change: `${degreeDays.actual >= degreeDays.normal ? '+' : '−'}${fixed(
                    Math.abs((degreeDays.actual / degreeDays.normal - 1) * 100),
                    0,
                  )}%`,
                })
              : undefined
          }
        />
      )}
      {line && (
        <Tile label={t('gas.slope')} value={fixed(line.slope, 3)} unit={t('gas.perDdUnit')} />
      )}
      <Tile
        label={t('gas.baseline')}
        value={whole(baseline.value * DAYS_PER_MONTH)}
        unit={t('gas.perMonthUnit')}
        note={t(`gas.baselineSource.${baseline.source}`)}
      />
    </div>
  );
}

function Years({ analysis, comparison }: { analysis: GasAnalysis; comparison?: GasComparison }) {
  const { t } = useTranslation();
  // CBS publishes calendar years only (design §11.1).
  const cbs = new Map(
    analysis.yearStart === '01-01' ? comparison?.cbs?.medians.map((m) => [m.year, m.p50]) : [],
  );
  return (
    <table className="gas-years">
      <thead>
        <tr>
          <th>{t('gas.year')}</th>
          <th>{t('gas.actual')}</th>
          <th>{t('gas.degreeDaysShort')}</th>
          <th>{t('gas.corrected')}</th>
          <th>{t('gas.baselineColumn')}</th>
          {cbs.size > 0 && <th>{t('gas.cbsMedian')}</th>}
        </tr>
      </thead>
      <tbody>
        {analysis.years.map((y) => (
          <tr key={y.year}>
            <td>
              {y.label}
              {!y.complete && <small> {t('gas.incompleteYear', { days: y.days })}</small>}
            </td>
            <td>
              {whole(y.m3)}
              {y.filled > 0 && (
                <small className="gas-years__estimate">
                  {' '}
                  {t('gas.estimatedShort', { count: y.filled })}
                </small>
              )}
            </td>
            <td>{whole(y.ddYear)}</td>
            <td>{y.corrected === null ? '—' : whole(y.corrected)}</td>
            <td>{whole(y.baseline * DAYS_PER_MONTH)}</td>
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
            <p className="history-hint">
              {data.settlement ? (
                t('gas.settlementNote')
              ) : (
                <IonButton
                  fill="clear"
                  size="small"
                  routerLink="/settings/gas"
                  className="gas-link"
                >
                  {t('gas.fillExpected')}
                </IonButton>
              )}
            </p>
          )}

          {data && (
            <div className="history-charts gas-sections">
              <section>
                <div className="gas-section-head">
                  <h2 className="live__heading">{t('gas.perDdTitle')}</h2>
                  <div className="gas-switch" role="group" aria-label={t('gas.perDdTitle')}>
                    {(['week', 'month', 'year'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={kind === k}
                        onClick={() => setKind(k)}
                      >
                        {t(k === 'year' ? 'gas.yearTab' : `gas.${k}`)}
                      </button>
                    ))}
                  </div>
                </div>
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
              {hourly.data && hourly.data.curve.length > 0 && (
                <>
                  <section>
                    <h2 className="live__heading">{t('gas.curveTitle')}</h2>
                    <Suspense fallback={chartFallback}>
                      <TemperatureCurveChart hourly={hourly.data} />
                    </Suspense>
                    <p className="history-hint">
                      {t('gas.curveHint')}
                      {hourly.data.hourlyUpdates && ` ${t('gas.hourlyShifted')}`}
                    </p>
                  </section>
                  <section>
                    <h2 className="live__heading">{t('gas.profileTitle2')}</h2>
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
                    <p className="history-hint">{t('gas.profileHint')}</p>
                  </section>
                </>
              )}
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
