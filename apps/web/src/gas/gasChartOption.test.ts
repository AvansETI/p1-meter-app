// @vitest-environment node
import type { GasAnalysis, GasHourly, GasPeriodResponse } from '@p1/shared';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { describe, expect, it } from 'vitest';
import {
  dayProfileOption,
  perDegreeDayOption,
  scatterOption,
  temperatureCurveOption,
} from './gasChartOption';

echarts.use([BarChart, LineChart, ScatterChart, GridComponent, TooltipComponent, SVGRenderer]);

const theme = {
  gasColor: '#6f55c2',
  coldColor: '#293d66',
  textColor: '#222c3b',
  mutedColor: '#5a6475',
  surfaceColor: '#f2f3f6',
  fontFamily: 'sans-serif',
};
const format = (v: number) => v.toFixed(2);
const hairline = { type: 'line', lineStyle: { type: 'dashed', color: theme.mutedColor } };

const periods: GasPeriodResponse[] = [0.3, 0.25, 0.28].map((perDd, i) => ({
  start: `2026-0${i + 1}-01`,
  key: `2026-0${i + 1}`,
  days: 30,
  filled: 0,
  m3: 100,
  dd: 400,
  perDd,
}));
const analysis = {
  days: [
    { day: '2026-01-01', m3: 4, t: 2, dd: 16 },
    { day: '2026-01-02', m3: 2, t: 8, dd: 10 },
  ],
  line: { slope: 0.2, intercept: 0.5, r2: 0.9, n: 2 },
} as GasAnalysis;
const hourly: GasHourly = {
  pending: false,
  from: '2026-08-17',
  to: '2026-11-15',
  hourlyUpdates: true,
  curve: [
    { t: 2, m3: 0.4, n: 40 },
    { t: 5, m3: 0.2, n: 30 },
  ],
  profiles: { cold: null, mild: Array.from({ length: 24 }, () => 0.1) },
};

type Option = EChartsCoreOption & {
  tooltip: { trigger: string; axisPointer: unknown; formatter: (p: unknown) => string };
  xAxis: { axisPointer?: unknown };
};

const charts: Array<[string, Option]> = [
  [
    'per degree day',
    perDegreeDayOption(periods, ['jan', 'feb', 'mrt'], theme, {
      perDd: 'Per graaddag',
      perDdUnit: 'm³/graaddag',
      trend: 'Trend',
      format,
      title: (i) => `period ${i}`,
      estimated: (n) => `${n} geschat`,
    }) as Option,
  ],
  [
    'scatter',
    scatterOption(analysis, theme, {
      dd: 'Graaddagen',
      perDayUnit: 'm³/dag',
      m3: 'Gas',
      line: 'Stooklijn',
      format,
      date: (d) => d,
    }) as Option,
  ],
  [
    'temperature curve',
    temperatureCurveOption(hourly, theme, {
      temperature: 'Buitentemperatuur',
      perHourUnit: 'm³/uur',
      m3: 'Gas',
      format,
      hours: (n) => `${n} uur`,
    }) as Option,
  ],
  [
    'day profile',
    dayProfileOption(hourly, theme, {
      cold: 'Koud',
      mild: 'Zacht',
      perHourUnit: 'm³/uur',
      format,
    }) as Option,
  ],
];

describe('gas page charts', () => {
  it.each(charts)('%s renders in ECharts', (_name, option) => {
    const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 400, height: 200 });
    chart.setOption(option);
    expect(chart.renderToSVGString()).toContain('<svg');
    chart.dispose();
  });

  it.each(charts)('%s follows the pointer with a hairline', (_name, option) => {
    // The scatter keeps a tooltip per day; its hairline sits on the x-axis.
    const pointer =
      option.tooltip.trigger === 'axis' ? option.tooltip.axisPointer : option.xAxis.axisPointer;
    expect(pointer).toMatchObject(hairline);
  });

  it('shows the temperature curve tooltip for the nearest point', () => {
    const [, option] = charts[2]!;
    expect(option.tooltip.formatter([{ value: [5, 0.2, 30] }])).toBe(
      '5 °C<br/>Gas: 0.20<br/>30 uur',
    );
  });
});
