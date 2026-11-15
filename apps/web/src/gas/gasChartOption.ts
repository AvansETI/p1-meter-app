/** ECharts options of the Gas page (docs/design/2026-11-15-gas-analysis.md §7.1). */
import type { GasAnalysis, GasHourly, GasPeriodResponse } from '@p1/shared';
import type { EChartsCoreOption } from 'echarts/core';

export interface GasChartTheme {
  gasColor: string;
  coldColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  fontFamily: string;
}

/** Room at the top for the unit of the value axis. */
const grid = { left: 48, right: 12, top: 30, bottom: 40 };

/** Value axis with its unit above it, e.g. "m³/dag". */
function valueAxis(theme: GasChartTheme, unit: string) {
  return {
    type: 'value',
    ...axis(theme),
    // Always at the left edge, also when the x-axis crosses zero (temperatures below 0 °C).
    axisLine: { onZero: false, lineStyle: { color: theme.mutedColor, opacity: 0.4 } },
    name: unit,
    nameLocation: 'end' as const,
    nameGap: 12,
    nameTextStyle: {
      color: theme.mutedColor,
      fontWeight: 600,
      align: 'left' as const,
      padding: [0, 0, 0, -40],
    },
    min: 0,
  };
}

function axis(theme: GasChartTheme, name?: string) {
  return {
    name,
    nameLocation: 'middle' as const,
    nameGap: 26,
    nameTextStyle: { color: theme.mutedColor, fontWeight: 600 },
    axisLabel: { color: theme.mutedColor, hideOverlap: true },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: theme.mutedColor, opacity: 0.4 } },
    splitLine: { lineStyle: { color: theme.mutedColor, opacity: 0.15 } },
  };
}

function tooltip(
  theme: GasChartTheme,
  trigger: 'axis' | 'item',
  formatter: (p: unknown) => string,
) {
  return {
    trigger,
    backgroundColor: theme.surfaceColor,
    borderWidth: 0,
    textStyle: { color: theme.textColor },
    formatter,
  };
}

/** Least-squares line through the non-empty values (by position); null with fewer than 3. */
export function trend(values: Array<number | null>): Array<number | null> | null {
  const points = values.flatMap((v, i) => (v === null ? [] : [[i, v] as const]));
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((s, [x]) => s + x, 0) / n;
  const my = points.reduce((s, [, y]) => s + y, 0) / n;
  const sxx = points.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  const slope = sxx ? points.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / sxx : 0;
  const first = points[0]![0];
  const last = points[n - 1]![0];
  return values.map((_, i) => (i >= first && i <= last ? my + slope * (i - mx) : null));
}

/** Heating gas per degree day per period, with a dashed trend line. */
export function perDegreeDayOption(
  periods: GasPeriodResponse[],
  labels: string[],
  theme: GasChartTheme,
  text: {
    perDd: string;
    perDdUnit: string;
    trend: string;
    format: (v: number) => string;
    title: (i: number) => string;
  },
): EChartsCoreOption {
  const values = periods.map((p) => p.perDd);
  const line = trend(values);
  return {
    animation: false,
    grid,
    textStyle: { fontFamily: theme.fontFamily },
    xAxis: { type: 'category', data: labels, ...axis(theme), splitLine: { show: false } },
    yAxis: valueAxis(theme, text.perDdUnit),
    tooltip: tooltip(theme, 'axis', (params) => {
      const i = (params as Array<{ dataIndex: number }>)[0]?.dataIndex ?? 0;
      const v = values[i];
      return `${text.title(i)}<br/>${text.perDd}: ${v === null || v === undefined ? '—' : text.format(v)}`;
    }),
    series: [
      {
        type: 'bar',
        name: text.perDd,
        data: values,
        itemStyle: { color: theme.gasColor, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 28,
      },
      ...(line
        ? [
            {
              type: 'line',
              name: text.trend,
              data: line,
              symbol: 'none',
              lineStyle: { color: theme.textColor, type: 'dashed', width: 1.5 },
              silent: true,
            },
          ]
        : []),
    ],
  };
}

/** Heating season (July–June) of a day, e.g. "2025/26". */
export function heatingSeason(day: string): string {
  const year = Number(day.slice(0, 4));
  const start = Number(day.slice(5, 7)) >= 7 ? year : year - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Daily gas against degree days per heating season, with the heating line. */
export function scatterOption(
  analysis: GasAnalysis,
  theme: GasChartTheme,
  text: {
    dd: string;
    perDayUnit: string;
    m3: string;
    line: string;
    format: (v: number) => string;
    date: (day: string) => string;
  },
): EChartsCoreOption {
  const bySeason = new Map<string, Array<[number, number, string]>>();
  for (const d of analysis.days) {
    if (d.m3 === null || d.dd === null) continue;
    const season = heatingSeason(d.day);
    const list = bySeason.get(season) ?? [];
    list.push([d.dd, d.m3, d.day]);
    bySeason.set(season, list);
  }
  const seasons = [...bySeason.keys()].sort();
  const latest = seasons.at(-1);
  const maxDd = Math.max(1, ...analysis.days.map((d) => d.dd ?? 0));
  const { line } = analysis;
  return {
    animation: false,
    grid: { ...grid, bottom: 44 },
    textStyle: { fontFamily: theme.fontFamily },
    xAxis: { type: 'value', ...axis(theme, text.dd), min: 0 },
    yAxis: valueAxis(theme, text.perDayUnit),
    tooltip: tooltip(theme, 'item', (params) => {
      const p = params as { seriesName: string; value: [number, number, string?] };
      if (p.value[2] === undefined) return p.seriesName;
      return `${text.date(p.value[2])}<br/>${text.dd}: ${p.value[0].toLocaleString('nl-NL', { maximumFractionDigits: 1 })}<br/>${text.m3}: ${text.format(p.value[1])}`;
    }),
    series: [
      ...seasons.map((season) => ({
        type: 'scatter',
        name: season,
        data: bySeason.get(season),
        symbolSize: 5,
        itemStyle: {
          color: season === latest ? theme.gasColor : theme.mutedColor,
          opacity: season === latest ? 0.85 : 0.35,
        },
        z: season === latest ? 3 : 2,
      })),
      ...(line
        ? [
            {
              type: 'line',
              name: text.line,
              data: [
                [0, line.intercept],
                [maxDd, line.intercept + line.slope * maxDd],
              ],
              symbol: 'none',
              lineStyle: { color: theme.textColor, width: 2 },
              silent: true,
              z: 4,
            },
          ]
        : []),
    ],
  };
}

/** Mean gas per hour against the outdoor temperature. */
export function temperatureCurveOption(
  hourly: GasHourly,
  theme: GasChartTheme,
  text: {
    temperature: string;
    perHourUnit: string;
    m3: string;
    format: (v: number) => string;
    hours: (n: number) => string;
  },
): EChartsCoreOption {
  return {
    animation: false,
    grid: { ...grid, bottom: 44 },
    textStyle: { fontFamily: theme.fontFamily },
    xAxis: { type: 'value', ...axis(theme, text.temperature), scale: true },
    yAxis: valueAxis(theme, text.perHourUnit),
    tooltip: tooltip(theme, 'item', (params) => {
      const [t, m3, n] = (params as { value: [number, number, number] }).value;
      return `${t} °C<br/>${text.m3}: ${text.format(m3)}<br/>${text.hours(n)}`;
    }),
    series: [
      {
        type: 'line',
        data: hourly.curve.map((b) => [b.t, b.m3, b.n]),
        symbolSize: 6,
        itemStyle: { color: theme.gasColor },
        lineStyle: { color: theme.gasColor, width: 2 },
      },
    ],
  };
}

/** Mean gas per hour of the day on cold and on mild days. */
export function dayProfileOption(
  hourly: GasHourly,
  theme: GasChartTheme,
  text: { cold: string; mild: string; perHourUnit: string; format: (v: number) => string },
): EChartsCoreOption {
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  const series = [
    { name: text.cold, data: hourly.profiles.cold, color: theme.coldColor },
    { name: text.mild, data: hourly.profiles.mild, color: theme.gasColor },
  ].filter((s) => s.data !== null);
  return {
    animation: false,
    grid,
    textStyle: { fontFamily: theme.fontFamily },
    xAxis: {
      type: 'category',
      data: hours,
      ...axis(theme),
      axisLabel: { color: theme.mutedColor, interval: 5 },
      splitLine: { show: false },
    },
    yAxis: valueAxis(theme, text.perHourUnit),
    tooltip: tooltip(theme, 'axis', (params) => {
      const list = params as Array<{ dataIndex: number; seriesName: string; value: number | null }>;
      const head = hours[list[0]?.dataIndex ?? 0]!;
      return [
        head,
        ...list.map((p) => `${p.seriesName}: ${p.value === null ? '—' : text.format(p.value)}`),
      ].join('<br/>');
    }),
    series: series.map((s) => ({
      type: 'line',
      name: s.name,
      data: s.data,
      symbol: 'none',
      smooth: true,
      connectNulls: false,
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
    })),
  };
}
