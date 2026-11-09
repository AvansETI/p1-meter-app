import type { RecentSeries } from '@p1/shared';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { useIonViewDidEnter } from '@ionic/react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatKw, formatPowerText } from '../format';
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
  const chartRef = useRef<echarts.ECharts | undefined>(undefined);
  const animatedRef = useRef(false);

  const buildOption = useCallback(() => {
    // Animate only the first drawing; minute updates should not replay the animation.
    const animate =
      !animatedRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    animatedRef.current = true;
    return recentChartOption(
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
    );
  }, [series, hasExport, t]);
  const buildRef = useRef(buildOption);

  // One chart instance for the component's lifetime (#19): re-creating it on every data update
  // while the element had no size (hidden tab, iOS app in the background) left a 0×0 chart.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const chart = echarts.init(element, undefined, { renderer: 'svg' });
    chartRef.current = chart;

    const resize = () => {
      if (element.clientWidth > 0) chart.resize();
    };
    const redraw = () => chart.setOption(buildRef.current(), true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') requestAnimationFrame(resize);
    };

    // Re-colour when the theme class on <html> changes; resize with the container and whenever
    // the page becomes visible again (Safari does not always report the size change).
    const themeObserver = new MutationObserver(redraw);
    themeObserver.observe(document.documentElement, { attributeFilter: ['class'] });
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);

    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      chart.dispose();
      chartRef.current = undefined;
    };
  }, []);

  // New data: update the existing chart instead of creating a new one.
  useEffect(() => {
    buildRef.current = buildOption;
    const chart = chartRef.current;
    const element = ref.current;
    if (!chart || !element) return;
    chart.setOption(buildOption(), true);
    if (chart.getWidth() !== element.clientWidth) requestAnimationFrame(() => chart.resize());
  }, [buildOption]);

  // Ionic keeps the Live page in the DOM while another tab is shown; resize on return.
  useIonViewDidEnter(() => chartRef.current?.resize());

  return <div ref={ref} className="recent-chart" role="img" aria-label={t('live.chartLabel')} />;
}
