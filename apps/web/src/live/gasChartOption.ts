import type { GasSeries } from '@p1/shared';
import type { EChartsCoreOption } from 'echarts/core';
import type { ChartTheme } from './chartOption';

export interface GasChartText {
  formatM3: (value: number) => string;
  /** "HH:00" for an hour start. */
  formatHour: (date: Date) => string;
  /** Suffix for a value that covers a gap, e.g. "(niet uitgesplitst)". */
  gapNote: string;
  /** Extra line for meters that report gas once per hour, or undefined. */
  hourlyNote?: string;
}

const HOUR_MS = 3_600_000;

/** ECharts option for the hourly gas bars (docs/design/2026-11-09-gas-chart.md §4). */
export function gasChartOption(
  series: GasSeries,
  theme: Pick<ChartTheme, 'mutedColor' | 'textColor' | 'surfaceColor' | 'fontFamily'> & {
    gasColor: string;
  },
  text: GasChartText,
  animate: boolean,
): EChartsCoreOption {
  const labels = series.hours.map((hour) => text.formatHour(new Date(hour.start)));
  const data = series.hours.map((hour) => ({
    value: hour.m3,
    // A value after a gap is not broken down per hour: dimmed with a dashed outline.
    itemStyle: hour.spansGap
      ? { opacity: 0.45, borderType: 'dashed', borderColor: theme.gasColor, borderWidth: 1 }
      : undefined,
  }));

  return {
    animation: animate,
    grid: { left: 40, right: 8, top: 12, bottom: 24 },
    textStyle: { fontFamily: theme.fontFamily },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: theme.surfaceColor,
      borderWidth: 0,
      textStyle: { color: theme.textColor },
      formatter: (params: unknown) => {
        const index = (params as Array<{ dataIndex: number }>)[0]?.dataIndex ?? 0;
        const hour = series.hours[index];
        if (!hour) return '';
        const end = new Date(Date.parse(hour.start) + HOUR_MS);
        const from = new Date(hour.gapStart ?? hour.start);
        const range = `${text.formatHour(from)}–${text.formatHour(end)}`;
        const value = hour.m3 === null ? '–' : `${text.formatM3(hour.m3)} m³`;
        const lines = [`${range}: ${value}${hour.spansGap ? ` ${text.gapNote}` : ''}`];
        if (text.hourlyNote) lines.push(text.hourlyNote);
        return lines.join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: theme.mutedColor, interval: 5 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.mutedColor, opacity: 0.4 } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { color: theme.mutedColor, formatter: (value: number) => text.formatM3(value) },
      splitLine: { lineStyle: { color: theme.mutedColor, opacity: 0.15 } },
    },
    series: [{ type: 'bar', data, color: theme.gasColor, barMaxWidth: 14 }],
  };
}
