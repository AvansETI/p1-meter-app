// @vitest-environment node
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { describe, expect, it } from 'vitest';
import { recentChartOption, splitNet } from './chartOption';

echarts.use([LineChart, GridComponent, TooltipComponent, SVGRenderer]);

const theme = {
  importColor: '#293d66',
  exportColor: '#189c71',
  textColor: '#222c3b',
  mutedColor: '#5a6475',
  surfaceColor: '#f2f3f6',
  fontFamily: 'sans-serif',
};
const text = {
  net: (n: number) => `${n} kW`,
  formatKw: (n: number) => String(n),
  formatTime: (d: Date) => d.toISOString(),
};

const start = Date.parse('2026-11-08T12:15:00Z');
const series = (values: Array<number | null>) => ({
  stepSec: 300,
  points: values.map((netKw, i) => ({ t: new Date(start + i * 300_000).toISOString(), netKw })),
});

describe('splitNet', () => {
  it('splits net into import (≥ 0) and export (≤ 0), keeping gaps', () => {
    const { imports, exports } = splitNet(series([1.5, -0.4, null]));
    expect(imports.map((p) => p[1])).toEqual([1.5, 0, null]);
    expect(exports.map((p) => p[1])).toEqual([0, -0.4, null]);
  });
});

describe('recentChartOption renders in ECharts', () => {
  // Regression: a piecewise visualMap crashed ECharts 6.1 ("reading 'coord'").
  it.each([
    ['mixed with gaps', [...Array<null>(250).fill(null), 1.2, -0.8, 0.3, null, 2.1], true],
    ['only gaps', Array<null>(289).fill(null), true],
    ['without export', [0.05, 0.07, null, 0.09], false],
    ['empty', [], true],
  ] as const)('%s', (_name, values, hasExport) => {
    const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 400, height: 200 });
    chart.setOption(recentChartOption(series([...values]), hasExport, theme, text, false));
    expect(chart.renderToSVGString()).toContain('<svg');
    chart.dispose();
  });
});
