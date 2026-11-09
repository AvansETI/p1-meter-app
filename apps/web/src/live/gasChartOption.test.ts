// @vitest-environment node
import type { GasSeries } from '@p1/shared';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { describe, expect, it } from 'vitest';
import { gasChartOption } from './gasChartOption';

echarts.use([BarChart, GridComponent, TooltipComponent, SVGRenderer]);

const theme = {
  gasColor: '#6f55c2',
  textColor: '#222c3b',
  mutedColor: '#5a6475',
  surfaceColor: '#f2f3f6',
  fontFamily: 'sans-serif',
};
const text = {
  formatM3: (v: number) => v.toFixed(2),
  formatHour: (d: Date) => d.toISOString().slice(11, 16),
  gapNote: '(niet uitgesplitst)',
};
const start = Date.parse('2026-11-08T15:00:00Z');
const series = (values: Array<number | null>, gapAt?: number): GasSeries => ({
  hourlyUpdates: false,
  hours: values.map((m3, i) => ({
    start: new Date(start + i * 3_600_000).toISOString(),
    m3,
    ...(i === gapAt && { spansGap: true as const, gapStart: new Date(start).toISOString() }),
  })),
});

describe('gasChartOption renders in ECharts', () => {
  it.each([
    ['values with a gap', series([0.1, null, null, 0.6, 0.2], 3)],
    ['only empty hours', series(Array<null>(24).fill(null))],
    ['all zero', series(Array<number>(24).fill(0))],
  ])('%s', (_name, data) => {
    const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 400, height: 200 });
    chart.setOption(gasChartOption(data, theme, text, false));
    expect(chart.renderToSVGString()).toContain('<svg');
    chart.dispose();
  });

  it('marks gap values and explains hourly meters in the tooltip', () => {
    const data = { ...series([0.1, null, 0.6], 2), hourlyUpdates: true };
    const option = gasChartOption(data, theme, { ...text, hourlyNote: 'uurlijks' }, false) as {
      tooltip: { formatter: (p: unknown) => string };
      series: Array<{ data: Array<{ itemStyle?: object }> }>;
    };
    expect(option.series[0]!.data[2]!.itemStyle).toMatchObject({ borderType: 'dashed' });
    const tooltip = option.tooltip.formatter([{ dataIndex: 2 }]);
    expect(tooltip).toBe('15:00–18:00: 0.60 m³ (niet uitgesplitst)<br/>uurlijks');
  });
});
