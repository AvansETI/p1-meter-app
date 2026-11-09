import type { RecentSeries } from '@p1/shared';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKw } from '../format';
import { recentChartOption } from './chartOption';

echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const chart = echarts.init(element, undefined, { renderer: 'svg' });

    const render = () =>
      chart.setOption(
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
              t(net < 0 ? 'live.chartExport' : 'live.chartImport', { value: formatKw(net) }),
            formatKw,
            formatTime: (date) => hourMinute.format(date),
          },
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        ),
        true,
      );

    render();
    // Re-colour when the theme class on <html> changes; resize with the container.
    const themeObserver = new MutationObserver(render);
    themeObserver.observe(document.documentElement, { attributeFilter: ['class'] });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(element);

    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [series, hasExport, t]);

  return <div ref={ref} className="recent-chart" role="img" aria-label={t('live.chartLabel')} />;
}
