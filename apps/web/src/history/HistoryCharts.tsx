import type { History } from '@p1/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKwh, formatM3, formatMoment } from '../format';
import { css, useEChart } from '../live/useEChart';
import { bucketLabel, bucketTitle } from './dates';
import {
  energyChartOption,
  gasHistoryChartOption,
  type HistoryChartText,
  type HistoryChartTheme,
} from './historyChartOption';

const theme = (): HistoryChartTheme => ({
  importColor: css('--app-data-import'),
  exportColor: css('--app-data-export'),
  gasColor: css('--app-data-gas'),
  netColor: css('--ion-text-color'),
  textColor: css('--ion-text-color'),
  mutedColor: css('--app-text-muted'),
  surfaceColor: css('--app-surface'),
  fontFamily: css('--ion-font-family'),
});

function useText(history: History): HistoryChartText {
  const { t } = useTranslation();
  const starts = history.buckets.map((b) => b.start);
  return {
    labels: starts.map((s) => bucketLabel(history.period, s)),
    titles: starts.map((s, i) => bucketTitle(history.period, s, starts[i + 1])),
    formatKwh,
    formatM3,
    names: {
      import: t('history.import'),
      export: t('history.export'),
      net: t('history.net'),
      gas: t('history.gas'),
    },
    gapNote: (gapStart) => t('history.gapNote', { since: formatMoment(gapStart) }),
  };
}

/** Electricity bars with net line; tapping a bar zooms into that bucket. */
export function EnergyChart({
  history,
  hasExport,
  onSelect,
}: {
  history: History;
  hasExport: boolean;
  onSelect?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const text = useText(history);
  const build = useCallback(
    () => energyChartOption(history, hasExport, theme(), text),
    // text is derived from history and the language
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, hasExport, t],
  );
  const ref = useEChart(build, onSelect);
  return (
    <div ref={ref} className="history-chart" role="img" aria-label={t('history.energyChart')} />
  );
}

/** Gas bars; tapping a bar zooms into that bucket. */
export function GasHistoryChart({
  history,
  onSelect,
}: {
  history: History;
  onSelect?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const text = useText(history);
  const build = useCallback(
    () => gasHistoryChartOption(history, theme(), text),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, t],
  );
  const ref = useEChart(build, onSelect);
  return <div ref={ref} className="history-chart" role="img" aria-label={t('history.gasChart')} />;
}
