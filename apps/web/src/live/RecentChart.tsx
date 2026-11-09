import type { RecentSeries } from '@p1/shared';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKw } from '../format';

echarts.use([LineChart, GridComponent, TooltipComponent, VisualMapComponent, SVGRenderer]);

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const hourMinute = new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' });

/**
 * Net power over the last 24 hours: import above zero (navy), export below zero (green),
 * gaps as breaks. Colours come from the theme tokens and follow theme changes.
 */
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

    const render = () => {
      const muted = css('--app-text-muted');
      chart.setOption(
        {
          animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          grid: { left: 36, right: 8, top: 12, bottom: 24 },
          textStyle: { fontFamily: css('--ion-font-family') },
          tooltip: {
            trigger: 'axis',
            backgroundColor: css('--app-surface'),
            borderWidth: 0,
            textStyle: { color: css('--ion-text-color') },
            valueFormatter: (value: unknown) =>
              typeof value === 'number'
                ? t(value < 0 ? 'live.chartExport' : 'live.chartImport', { value: formatKw(value) })
                : '–',
          },
          xAxis: {
            type: 'time',
            axisLabel: {
              color: muted,
              formatter: (value: number) => hourMinute.format(new Date(value)),
            },
            axisLine: { lineStyle: { color: muted, opacity: 0.4 } },
            splitLine: { show: false },
          },
          yAxis: {
            type: 'value',
            min: hasExport ? undefined : 0,
            axisLabel: { color: muted, formatter: (value: number) => formatKw(value) },
            splitLine: { lineStyle: { color: muted, opacity: 0.15 } },
          },
          visualMap: {
            show: false,
            dimension: 1,
            pieces: [
              { gt: 0, color: css('--app-data-import') },
              { lte: 0, color: css('--app-data-export') },
            ],
          },
          series: [
            {
              type: 'line',
              showSymbol: false,
              connectNulls: false,
              lineStyle: { width: 1.5 },
              areaStyle: { opacity: 0.25 },
              data: series.points.map((p) => [p.t, p.netKw]),
            },
          ],
        },
        true,
      );
    };

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
