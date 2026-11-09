import type { RecentSeries } from '@p1/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKw, formatPowerText } from '../format';
import { recentChartOption } from './chartOption';
import { css, useEChart } from './useEChart';

const hourMinute = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' });

/** Net power over the last 24 hours; colours follow the theme tokens and theme changes. */
export default function RecentChart({
  series,
  hasExport,
}: {
  series: RecentSeries;
  hasExport: boolean;
}) {
  const { t } = useTranslation();
  const buildOption = useCallback(
    (animate: boolean) =>
      recentChartOption(
        series,
        hasExport,
        {
          importColor: css('--app-data-import'),
          exportColor: css('--app-data-export'),
          textColor: css('--ion-text-color'),
          mutedColor: css('--app-text-muted'),
          surfaceColor: css('--app-surface'),
          fontFamily: css('--ion-font-family'),
        },
        {
          net: (net) =>
            t(net < 0 ? 'live.chartExport' : 'live.chartImport', { value: formatPowerText(net) }),
          formatKw,
          formatTime: (date) => hourMinute.format(date),
        },
        animate,
      ),
    [series, hasExport, t],
  );
  const ref = useEChart(buildOption);

  return <div ref={ref} className="recent-chart" role="img" aria-label={t('live.chartLabel')} />;
}
