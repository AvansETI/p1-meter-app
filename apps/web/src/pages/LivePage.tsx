import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { LiveSnapshot, LiveStatus, TodayTotals } from '@p1/shared';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKw, formatKwh, formatM3, formatMoment } from '../format';
import { useRecentSeries, useTodayTotals } from '../live/queries';
import { useLiveSnapshot } from '../live/useLiveSnapshot';
import { useSession } from '../session/context';
import { shouldShowBanner } from '../install/banner';
import InstallBanner from '../install/InstallBanner';
import InstallSheet from '../install/InstallSheet';
import { useInstall } from '../install/useInstall';
import { useSettings } from '../settings/context';

// ECharts is large; load it only when the Live page shows the chart.
const RecentChart = lazy(() => import('../live/RecentChart'));

const MANUAL_URL = 'https://github.com/AvansETI/SmartMeter_DIY/wiki/6.-Gebruiksaanwijzing';

function StatusLine({ status, snapshot }: { status: LiveStatus; snapshot: LiveSnapshot }) {
  const { t } = useTranslation();
  const moment = formatMoment(snapshot.time);
  return (
    <p className={`live-status live-status--${status}`}>
      <span className="live-status__dot" aria-hidden="true" />
      {status === 'live'
        ? t('live.statusLive', { time: moment })
        : t('live.statusStale', { time: moment })}
    </p>
  );
}

function NetTile({ snapshot, muted }: { snapshot: LiveSnapshot; muted: boolean }) {
  const { t } = useTranslation();
  const exporting = snapshot.netKw < 0;
  return (
    <section className={`net-tile ${muted ? 'net-tile--muted' : ''}`} aria-live="off">
      <p className="net-tile__label">
        <span
          className={exporting ? 'marker marker--export' : 'marker marker--import'}
          aria-hidden="true"
        >
          {exporting ? '▲' : '▼'}
        </span>
        {exporting ? t('live.toGrid') : t('live.fromGrid')}
      </p>
      <p className="net-tile__value">
        {formatKw(snapshot.netKw)}
        <small>kW</small>
      </p>
    </section>
  );
}

function OfflineNotice({ snapshot }: { snapshot: LiveSnapshot }) {
  const { t } = useTranslation();
  return (
    <section className="offline-notice" role="status">
      <p className="offline-notice__title">
        {t('live.offlineTitle', { time: formatMoment(snapshot.time) })}
      </p>
      <p>{t('live.offlineHelp')}</p>
      <a href={MANUAL_URL} target="_blank" rel="noreferrer">
        {t('live.offlineLink')}
      </a>
    </section>
  );
}

function TodayGrid({ totals }: { totals: TodayTotals }) {
  const { t } = useTranslation();
  const items: Array<{ key: string; label: string; value: string; unit: string; marker: string }> =
    [
      {
        key: 'import',
        label: t('live.todayImport'),
        value: formatKwh(totals.importKwh),
        unit: 'kWh',
        marker: 'import',
      },
    ];
  if (totals.exportKwh !== undefined && totals.netKwh !== undefined) {
    items.push(
      {
        key: 'export',
        label: t('live.todayExport'),
        value: formatKwh(totals.exportKwh),
        unit: 'kWh',
        marker: 'export',
      },
      {
        key: 'net',
        label: t('live.todayNet'),
        value: formatKwh(totals.netKwh),
        unit: 'kWh',
        marker: 'net',
      },
    );
  }
  if (totals.gasM3 !== undefined) {
    items.push({
      key: 'gas',
      label: t('live.todayGas'),
      value: formatM3(totals.gasM3),
      unit: 'm³',
      marker: 'gas',
    });
  }
  return (
    <div className="today-grid">
      {items.map((item) => (
        <div key={item.key} className="today-item">
          <span className="today-item__label">
            <span className={`marker marker--${item.marker}`} aria-hidden="true" />
            {item.label}
          </span>
          <span className="today-item__value">
            {item.value}
            <small>{item.unit}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LivePage() {
  const { t } = useTranslation();
  const { settings, dismissInstallHint } = useSettings();
  const { state } = useSession();
  const install = useInstall();
  const ready = state.status === 'ready';
  const hasExport = ready && state.capabilities.hasExport;

  const live = useLiveSnapshot(ready);
  const today = useTodayTotals(settings.emonId, ready);
  const recent = useRecentSeries(settings.emonId, ready);
  const showBanner = shouldShowBanner({
    method: install.method,
    liveStatus: live.status,
    dismissedAt: settings.installHintDismissedAt,
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('live.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className={showBanner ? 'ion-padding live-content--banner' : 'ion-padding'}>
        <div className="live">
          <div className="live__now">
            {live.snapshot && live.status ? (
              <>
                <StatusLine status={live.status} snapshot={live.snapshot} />
                {live.status === 'offline' ? (
                  <OfflineNotice snapshot={live.snapshot} />
                ) : (
                  <NetTile snapshot={live.snapshot} muted={live.status === 'stale'} />
                )}
              </>
            ) : (
              <IonSkeletonText animated className="net-tile net-tile--skeleton" />
            )}
          </div>

          <section className="live__today">
            <h2 className="live__heading">{t('live.today')}</h2>
            {today.data && <TodayGrid totals={today.data} />}
            {today.isPending && <IonSkeletonText animated className="today-grid--skeleton" />}
            {today.isError && (
              <p className="live__error">
                {t('live.loadError')}{' '}
                <IonButton size="small" fill="clear" onClick={() => void today.refetch()}>
                  {t('live.retry')}
                </IonButton>
              </p>
            )}
          </section>

          <section className="live__recent">
            <h2 className="live__heading">
              {t('live.recent')} <small>kW</small>
            </h2>
            {recent.data && (
              <Suspense fallback={<IonSkeletonText animated className="recent-chart" />}>
                <RecentChart series={recent.data} hasExport={hasExport} />
              </Suspense>
            )}
            {recent.isPending && <IonSkeletonText animated className="recent-chart" />}
            {recent.isError && (
              <p className="live__error">
                {t('live.loadError')}{' '}
                <IonButton size="small" fill="clear" onClick={() => void recent.refetch()}>
                  {t('live.retry')}
                </IonButton>
              </p>
            )}
          </section>
        </div>
        {showBanner && (
          <div slot="fixed" className="install-banner-slot">
            <InstallBanner
              method={install.method}
              onInstall={install.start}
              onDismiss={dismissInstallHint}
            />
          </div>
        )}
        <InstallSheet
          method={install.method}
          isOpen={install.sheetOpen}
          onClose={install.closeSheet}
        />
      </IonContent>
    </IonPage>
  );
}
