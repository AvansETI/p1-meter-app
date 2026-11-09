import { useIonViewDidEnter } from '@ionic/react';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useRef } from 'react';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, SVGRenderer]);

/** Reads a theme token from <html>, so chart colours follow light/dark. */
export const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * One ECharts instance for the component's lifetime, updated with new options (#19):
 * re-creating it on every data update while the element had no size (hidden tab, iOS app in
 * the background) left a 0×0 chart. Re-colours on theme changes and resizes whenever the page
 * or the Ionic tab becomes visible again. `buildOption(animate)` is called with `true` only for
 * the first drawing, so periodic updates do not replay the animation.
 */
export function useEChart(buildOption: (animate: boolean) => EChartsCoreOption) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | undefined>(undefined);
  const buildRef = useRef(buildOption);
  const drawnRef = useRef(false);

  const option = () => {
    const animate =
      !drawnRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    drawnRef.current = true;
    return buildRef.current(animate);
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const chart = echarts.init(element, undefined, { renderer: 'svg' });
    chartRef.current = chart;

    const resize = () => {
      if (element.clientWidth > 0) chart.resize();
    };
    const redraw = () => chart.setOption(option(), true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') requestAnimationFrame(resize);
    };

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
    // The instance lives as long as the component; data changes are handled below.
  }, []);

  useEffect(() => {
    buildRef.current = buildOption;
    const chart = chartRef.current;
    const element = ref.current;
    if (!chart || !element) return;
    chart.setOption(option(), true);
    if (chart.getWidth() !== element.clientWidth) requestAnimationFrame(() => chart.resize());
  }, [buildOption]);

  // Ionic keeps the Live page in the DOM while another tab is shown; resize on return.
  useIonViewDidEnter(() => chartRef.current?.resize());

  return ref;
}
