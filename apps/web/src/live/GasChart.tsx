import type { GasSeries } from '@p1/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatM3 } from '../format';
import { gasChartOption } from './gasChartOption';
import { css, useEChart } from './useEChart';
import { dateFormat } from '../i18n/dates';

const hourFormat = () => dateFormat({ hour: '2-digit', minute: '2-digit' });

/** Gas use per hour over the last 24 hours. */
export default function GasChart({ series }: { series: GasSeries }) {
  const { t } = useTranslation();
  const buildOption = useCallback(
    (animate: boolean) =>
      gasChartOption(
        series,
        {
          gasColor: css('--app-data-gas'),
          textColor: css('--ion-text-color'),
          mutedColor: css('--app-text-muted'),
          surfaceColor: css('--app-surface'),
          fontFamily: css('--ion-font-family'),
        },
        {
          formatM3,
          formatHour: (date) => hourFormat().format(date),
          gapNote: t('live.gasGap'),
          hourlyNote: series.hourlyUpdates ? t('live.gasHourlyNote') : undefined,
        },
        animate,
      ),
    [series, t],
  );
  const ref = useEChart(buildOption);

  return <div ref={ref} className="recent-chart" role="img" aria-label={t('live.gasChartLabel')} />;
}
