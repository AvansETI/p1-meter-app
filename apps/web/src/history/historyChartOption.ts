import type { History } from '@p1/shared';
import type { EChartsCoreOption } from 'echarts/core';

export interface HistoryChartTheme {
  importColor: string;
  exportColor: string;
  gasColor: string;
  netColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  fontFamily: string;
}

export interface HistoryChartText {
  labels: string[];
  titles: string[];
  formatKwh: (value: number) => string;
  formatM3: (value: number) => string;
  names: { import: string; export: string; net: string; gas: string };
  /** "niet uitgesplitst, sinds …" for a bucket that spans a gap. */
  gapNote: (gapStartIso: string) => string;
}

const GAP_STYLE = (color: string) => ({
  opacity: 0.45,
  borderType: 'dashed' as const,
  borderColor: color,
  borderWidth: 1,
});

function base(theme: HistoryChartTheme, text: HistoryChartText) {
  return {
    animation: false,
    grid: { left: 44, right: 8, top: 12, bottom: 24 },
    textStyle: { fontFamily: theme.fontFamily },
    xAxis: {
      type: 'category',
      data: text.labels,
      axisLabel: { color: theme.mutedColor, hideOverlap: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.mutedColor, opacity: 0.4 } },
    },
  };
}

function tooltip(theme: HistoryChartTheme, lines: (index: number) => string[]) {
  return {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: theme.surfaceColor,
    borderWidth: 0,
    textStyle: { color: theme.textColor },
    formatter: (params: unknown) => {
      const index = (params as Array<{ dataIndex: number }>)[0]?.dataIndex ?? 0;
      return lines(index).join('<br/>');
    },
  };
}

/** Electricity: import up, export down (stacked around zero), net line (only with export). */
export function energyChartOption(
  history: History,
  hasExport: boolean,
  theme: HistoryChartTheme,
  text: HistoryChartText,
): EChartsCoreOption {
  const b = history.buckets;
  const bars = (key: 'importKwh' | 'exportKwh', color: string, sign: 1 | -1) =>
    b.map((bucket) => {
      const v = bucket[key];
      return {
        value: v === null || v === undefined ? null : sign * v,
        itemStyle: bucket.spansGap ? GAP_STYLE(color) : undefined,
      };
    });

  return {
    ...base(theme, text),
    tooltip: tooltip(theme, (i) => {
      const bucket = b[i];
      if (!bucket) return [];
      const fmt = (v: number | null | undefined) =>
        v === null || v === undefined ? '–' : `${text.formatKwh(v)} kWh`;
      const lines = [
        `<strong>${text.titles[i] ?? ''}</strong>`,
        `${text.names.import}: ${fmt(bucket.importKwh)}`,
      ];
      if (hasExport) {
        lines.push(
          `${text.names.export}: ${fmt(bucket.exportKwh)}`,
          `${text.names.net}: ${fmt(bucket.netKwh)}`,
        );
      }
      if (bucket.spansGap && bucket.gapStart) lines.push(text.gapNote(bucket.gapStart));
      return lines;
    }),
    yAxis: {
      type: 'value',
      axisLabel: { color: theme.mutedColor, formatter: (v: number) => text.formatKwh(Math.abs(v)) },
      splitLine: { lineStyle: { color: theme.mutedColor, opacity: 0.15 } },
    },
    series: [
      {
        name: text.names.import,
        type: 'bar',
        stack: 'energy',
        color: theme.importColor,
        barMaxWidth: 22,
        data: bars('importKwh', theme.importColor, 1),
      },
      ...(hasExport
        ? [
            {
              name: text.names.export,
              type: 'bar',
              stack: 'energy',
              color: theme.exportColor,
              barMaxWidth: 22,
              data: bars('exportKwh', theme.exportColor, -1),
            },
            {
              name: text.names.net,
              type: 'line',
              color: theme.netColor,
              symbolSize: 4,
              lineStyle: { width: 1.5, type: 'dashed' },
              connectNulls: false,
              data: b.map((bucket) => bucket.netKwh ?? null),
            },
          ]
        : []),
    ],
  };
}

/** Gas per bucket (only for households with gas). */
export function gasHistoryChartOption(
  history: History,
  theme: HistoryChartTheme,
  text: HistoryChartText,
): EChartsCoreOption {
  const b = history.buckets;
  return {
    ...base(theme, text),
    tooltip: tooltip(theme, (i) => {
      const bucket = b[i];
      if (!bucket) return [];
      const v = bucket.gasM3;
      const lines = [
        `<strong>${text.titles[i] ?? ''}</strong>`,
        `${text.names.gas}: ${v === null || v === undefined ? '–' : `${text.formatM3(v)} m³`}`,
      ];
      if (bucket.spansGap && bucket.gapStart) lines.push(text.gapNote(bucket.gapStart));
      return lines;
    }),
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { color: theme.mutedColor, formatter: (v: number) => text.formatM3(v) },
      splitLine: { lineStyle: { color: theme.mutedColor, opacity: 0.15 } },
    },
    series: [
      {
        name: text.names.gas,
        type: 'bar',
        color: theme.gasColor,
        barMaxWidth: 22,
        data: b.map((bucket) => ({
          value: bucket.gasM3 ?? null,
          itemStyle: bucket.spansGap ? GAP_STYLE(theme.gasColor) : undefined,
        })),
      },
    ],
  };
}
