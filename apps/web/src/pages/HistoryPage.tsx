import {
  createGesture,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  formatPlainDate,
  parsePlainDate,
  PeriodSchema,
  periodStart,
  shiftPeriod,
  type History,
  type Period,
  type PlainDate,
  type Totals,
} from '@p1/shared';
import { chevronBack, chevronForward } from 'ionicons/icons';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolbarLogo from '../components/ToolbarLogo';
import { useSearchParams } from 'react-router-dom';
import { formatKwh, formatM3 } from '../format';
import { compare, type Stream } from '../history/comparison';
import { dateOfInstant, periodLabel, today } from '../history/dates';
import { useHistory } from '../history/queries';
import { useSession } from '../session/context';
import { useSettings } from '../settings/context';

// ECharts is large; load the charts only when they are shown.
const EnergyChart = lazy(() =>
  import('../history/HistoryCharts').then((m) => ({ default: m.EnergyChart })),
);
const GasHistoryChart = lazy(() =>
  import('../history/HistoryCharts').then((m) => ({ default: m.GasHistoryChart })),
);

const SWIPE_DISTANCE = 60;

/** "2026", "2026-11" or "2026-11-09" from IonDatetime → a plain date. */
function pickedDate(value: string | string[] | null | undefined): PlainDate | null {
  if (typeof value !== 'string') return null;
  const [year = '', month = '01', day = '01'] = value.slice(0, 10).split('-');
  return parsePlainDate(`${year}-${month}-${day}`);
}

const PRESENTATION: Record<Period, 'date' | 'month-year' | 'year'> = {
  day: 'date',
  week: 'date',
  month: 'month-year',
  year: 'year',
};

function SummaryItem({
  stream,
  label,
  value,
  unit,
  totals,
  previous,
  period,
}: {
  stream: Stream;
  label: string;
  value: number | null | undefined;
  unit: string;
  totals: Totals;
  previous: Totals | null;
  period: Period;
}) {
  const { t } = useTranslation();
  const comparison = compare(totals, previous, stream);
  const format = stream === 'gas' ? formatM3 : formatKwh;
  return (
    <div className="today-item">
      <span className="today-item__label">
        <span className={`marker marker--${stream}`} aria-hidden="true" />
        {label}
      </span>
      <span className="today-item__value">
        {value === null || value === undefined ? '–' : format(value)}
        <small>{unit}</small>
      </span>
      {comparison === 'incomplete' && (
        <span className="history-change history-change--neutral">{t('history.incomplete')}</span>
      )}
      {comparison && comparison !== 'incomplete' && (
        <span className={`history-change history-change--${comparison.tone}`}>
          {t('history.change', {
            arrow: comparison.percent < 0 ? '▼' : '▲',
            percent: Math.abs(comparison.percent),
            period: t(`history.vs.${period}`),
          })}
        </span>
      )}
    </div>
  );
}

function Summary({
  history,
  hasExport,
  hasGas,
}: {
  history: History;
  hasExport: boolean;
  hasGas: boolean;
}) {
  const { t } = useTranslation();
  const { totals, previous, period } = history;
  const common = { totals, previous, period };
  return (
    <div className="today-grid">
      <SummaryItem
        stream="import"
        label={t('history.import')}
        value={totals.importKwh}
        unit="kWh"
        {...common}
      />
      {hasExport && (
        <>
          <SummaryItem
            stream="export"
            label={t('history.export')}
            value={totals.exportKwh}
            unit="kWh"
            {...common}
          />
          <SummaryItem
            stream="net"
            label={t('history.net')}
            value={totals.netKwh}
            unit="kWh"
            {...common}
          />
        </>
      )}
      {hasGas && (
        <SummaryItem
          stream="gas"
          label={t('history.gas')}
          value={totals.gasM3}
          unit="m³"
          {...common}
        />
      )}
    </div>
  );
}

/** History per day, week, month and year (docs/design/2026-11-09-history.md §6). */
export default function HistoryPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { state } = useSession();
  const ready = state.status === 'ready';
  const hasExport = ready && state.capabilities.hasExport;
  const hasGas = ready && state.capabilities.hasGas;

  // Period and date live in the URL, so back/forward and bookmarks work.
  const [params, setParams] = useSearchParams();
  const period: Period = PeriodSchema.safeParse(params.get('period')).data ?? 'day';
  const todayDate = today();
  const requested = parsePlainDate(params.get('date') ?? '');
  const date =
    requested && formatPlainDate(requested) <= formatPlainDate(todayDate) ? requested : todayDate;
  const start = periodStart(date, period);

  const go = (nextPeriod: Period, nextDate: PlainDate) =>
    setParams({ period: nextPeriod, date: formatPlainDate(periodStart(nextDate, nextPeriod)) });

  const query = useHistory(
    settings.emonId,
    period,
    formatPlainDate(start),
    formatPlainDate(start) === formatPlainDate(periodStart(todayDate, period)),
    ready,
  );
  const history = query.data;

  const first = history ? parsePlainDate(history.firstData) : null;
  const isCurrent = formatPlainDate(start) >= formatPlainDate(periodStart(todayDate, period));
  const atFirst = first
    ? formatPlainDate(start) <= formatPlainDate(periodStart(first, period))
    : false;
  const previous = () => {
    if (!atFirst) go(period, shiftPeriod(date, period, -1));
  };
  const next = () => {
    if (!isCurrent) go(period, shiftPeriod(date, period, 1));
  };

  // Tapping a bar zooms in: year → month, month/week → day.
  const zoom = (index: number) => {
    const bucket = history?.buckets[index];
    if (!bucket) return;
    const target = dateOfInstant(bucket.start);
    if (period === 'year') go('month', target);
    else if (period === 'week' || period === 'month') go('day', target);
  };

  // Horizontal swipe over the charts: previous / next period.
  const chartsRef = useRef<HTMLDivElement>(null);
  const navRef = useRef({ previous, next });
  useEffect(() => {
    navRef.current = { previous, next };
  });
  useEffect(() => {
    const element = chartsRef.current;
    if (!element) return;
    const gesture = createGesture({
      el: element,
      gestureName: 'history-swipe',
      direction: 'x',
      threshold: 15,
      onEnd: ({ deltaX }) => {
        if (deltaX > SWIPE_DISTANCE) navRef.current.previous();
        else if (deltaX < -SWIPE_DISTANCE) navRef.current.next();
      },
    });
    gesture.enable();
    return () => gesture.destroy();
  }, []);

  const [picking, setPicking] = useState(false);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('history.title')}</IonTitle>
          <ToolbarLogo />
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="history">
          <IonSegment
            value={period}
            onIonChange={(event) => {
              const value = PeriodSchema.safeParse(event.detail.value);
              if (value.success) go(value.data, date);
            }}
          >
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <IonSegmentButton key={p} value={p}>
                <IonLabel>{t(`history.${p}`)}</IonLabel>
              </IonSegmentButton>
            ))}
          </IonSegment>

          <div className="history-nav">
            <IonButton
              fill="clear"
              onClick={previous}
              disabled={atFirst}
              aria-label={t('history.previous')}
            >
              <IonIcon icon={chevronBack} slot="icon-only" aria-hidden="true" />
            </IonButton>
            <IonButton fill="clear" className="history-nav__label" onClick={() => setPicking(true)}>
              {periodLabel(period, date)}
            </IonButton>
            <IonButton
              fill="clear"
              onClick={next}
              disabled={isCurrent}
              aria-label={t('history.next')}
            >
              <IonIcon icon={chevronForward} slot="icon-only" aria-hidden="true" />
            </IonButton>
          </div>

          {history && <Summary history={history} hasExport={hasExport} hasGas={hasGas} />}
          {query.isPending && <IonSkeletonText animated className="today-grid--skeleton" />}
          {query.isError && (
            <p className="live__error">
              {t('history.loadError')}{' '}
              <IonButton size="small" fill="clear" onClick={() => void query.refetch()}>
                {t('history.retry')}
              </IonButton>
            </p>
          )}

          <div ref={chartsRef} className="history-charts">
            <section>
              <h2 className="live__heading">
                {t('history.electricity')} <small>kWh</small>
              </h2>
              {history ? (
                <Suspense fallback={<IonSkeletonText animated className="history-chart" />}>
                  <EnergyChart
                    history={history}
                    hasExport={hasExport}
                    onSelect={period === 'day' ? undefined : zoom}
                  />
                </Suspense>
              ) : (
                <IonSkeletonText animated className="history-chart" />
              )}
            </section>
            {hasGas && (
              <section>
                <h2 className="live__heading">
                  {t('history.gasTitle')} <small>m³</small>
                </h2>
                {history ? (
                  <Suspense fallback={<IonSkeletonText animated className="history-chart" />}>
                    <GasHistoryChart
                      history={history}
                      onSelect={period === 'day' ? undefined : zoom}
                    />
                  </Suspense>
                ) : (
                  <IonSkeletonText animated className="history-chart" />
                )}
              </section>
            )}
          </div>
          {period !== 'day' && <p className="history-hint">{t('history.zoomHint')}</p>}
        </div>

        <IonModal
          isOpen={picking}
          onDidDismiss={() => setPicking(false)}
          className="history-picker"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{t('history.pickDate')}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setPicking(false)}>{t('history.done')}</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonDatetime
              presentation={PRESENTATION[period]}
              locale="nl-NL"
              firstDayOfWeek={1}
              value={formatPlainDate(date)}
              min={history?.firstData}
              max={formatPlainDate(todayDate)}
              onIonChange={(event) => {
                const picked = pickedDate(event.detail.value);
                if (picked) go(period, picked);
              }}
            />
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
