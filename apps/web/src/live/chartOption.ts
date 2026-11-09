import type { RecentSeries } from '@p1/shared';
import type { EChartsCoreOption } from 'echarts/core';

export type Point = [string, number | null];

export interface ChartTheme {
  importColor: string;
  exportColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  fontFamily: string;
}

export interface ChartText {
  /** Tooltip text for a net value, e.g. "3,52 kW van het net". */
  net: (netKw: number) => string;
  formatKw: (value: number) => string;
  formatTime: (date: Date) => string;
}

/**
 * Splits net power into an import part (≥ 0) and an export part (≤ 0), each drawn as its own
 * area. (A piecewise visualMap would be simpler, but ECharts 6.1 crashes on open-ended pieces.)
 */
export function splitNet(series: RecentSeries): { imports: Point[]; exports: Point[] } {
  const imports: Point[] = [];
  const exports: Point[] = [];
  for (const { t, netKw } of series.points) {
    imports.push([t, netKw === null ? null : Math.max(netKw, 0)]);
    exports.push([t, netKw === null ? null : Math.min(netKw, 0)]);
  }
  return { imports, exports };
}

/** ECharts option for the 24-hour net power chart (docs/design/2026-11-09-live-dashboard.md §5.4). */
export function recentChartOption(
  series: RecentSeries,
  hasExport: boolean,
  theme: ChartTheme,
  text: ChartText,
  animate: boolean,
): EChartsCoreOption {
  const { imports, exports } = splitNet(series);
  const line = (data: Point[], color: string) => ({
    type: 'line' as const,
    showSymbol: false,
    connectNulls: false,
    color,
    lineStyle: { width: 1.5 },
    areaStyle: { opacity: 0.25 },
    data,
  });

  return {
    animation: animate,
    grid: { left: 36, right: 8, top: 12, bottom: 24 },
    textStyle: { fontFamily: theme.fontFamily },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.surfaceColor,
      borderWidth: 0,
      textStyle: { color: theme.textColor },
      // One line per moment: the net value, summed from both series.
      formatter: (params: unknown) => {
        const items = params as Array<{ axisValue: number; value: Point }>;
        const time = text.formatTime(new Date(items[0]?.axisValue ?? 0));
        const net = items.reduce<number | null>(
          (sum, item) => (item.value[1] === null ? sum : (sum ?? 0) + item.value[1]),
          null,
        );
        return net === null ? `${time}: –` : `${time}: ${text.net(net)}`;
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        color: theme.mutedColor,
        formatter: (value: number) => text.formatTime(new Date(value)),
      },
      axisLine: { lineStyle: { color: theme.mutedColor, opacity: 0.4 } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: hasExport ? undefined : 0,
      axisLabel: { color: theme.mutedColor, formatter: (value: number) => text.formatKw(value) },
      splitLine: { lineStyle: { color: theme.mutedColor, opacity: 0.15 } },
    },
    series: [
      line(imports, theme.importColor),
      ...(hasExport ? [line(exports, theme.exportColor)] : []),
    ],
  };
}
