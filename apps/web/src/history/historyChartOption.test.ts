// @vitest-environment node
import type { History } from '@p1/shared';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { describe, expect, it } from 'vitest';
import { energyChartOption, gasHistoryChartOption } from './historyChartOption';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer]);

const theme = {
  importColor: '#293d66',
  exportColor: '#189c71',
  gasColor: '#6f55c2',
  netColor: '#222c3b',
  textColor: '#222c3b',
  mutedColor: '#5a6475',
  surfaceColor: '#f2f3f6',
  fontFamily: 'sans-serif',
};

const history = (n: number, withGap: boolean): History => ({
  period: 'week',
  start: '2026-11-08T23:00:00.000Z',
  end: '2026-11-15T23:00:00.000Z',
  firstData: '2023-08-30',
  buckets: Array.from({ length: n }, (_, i) => ({
    start: new Date(Date.parse('2026-11-08T23:00:00Z') + i * 86_400_000).toISOString(),
    importKwh: i === 2 ? null : 10 + i,
    exportKwh: i === 2 ? null : 2,
    netKwh: i === 2 ? null : 8 + i,
    gasM3: i === 2 ? null : 1,
    ...(withGap && i === 3 && { spansGap: true as const, gapStart: '2026-11-10T23:00:00.000Z' }),
  })),
  totals: { importKwh: 70, exportKwh: 12, netKwh: 58, gasM3: 6, complete: false },
  previous: null,
});

const text = (n: number) => ({
  labels: Array.from({ length: n }, (_, i) => `d${i}`),
  titles: Array.from({ length: n }, (_, i) => `day ${i}`),
  formatKwh: (v: number) => v.toFixed(1),
  formatM3: (v: number) => v.toFixed(2),
  names: { import: 'Afname', export: 'Terug', net: 'Netto', gas: 'Gas' },
  gapNote: (since: string) => `niet uitgesplitst, sinds ${since}`,
});

const render = (option: object) => {
  const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 400, height: 200 });
  chart.setOption(option);
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
};

describe('history chart options render in ECharts', () => {
  it.each([7, 24, 12, 31])('energy with export and gaps, %i buckets', (n) => {
    expect(render(energyChartOption(history(n, true), true, theme, text(n)))).toContain('<svg');
  });

  it('energy without export has no export bars or net line', () => {
    const option = energyChartOption(history(7, false), false, theme, text(7)) as {
      series: unknown[];
    };
    expect(option.series).toHaveLength(1);
    expect(render(option)).toContain('<svg');
  });

  it('gas, including an empty period', () => {
    expect(render(gasHistoryChartOption(history(7, true), theme, text(7)))).toContain('<svg');
    const empty = { ...history(0, false), buckets: [] };
    expect(render(gasHistoryChartOption(empty, theme, text(0)))).toContain('<svg');
  });

  it('draws export downwards and explains gaps in the tooltip', () => {
    const option = energyChartOption(history(7, true), true, theme, text(7)) as {
      series: Array<{ data: Array<{ value: number | null } | number | null> }>;
      tooltip: { formatter: (p: unknown) => string };
    };
    expect((option.series[1]!.data[0] as { value: number }).value).toBe(-2);
    expect(option.tooltip.formatter([{ dataIndex: 3 }])).toContain('niet uitgesplitst');
  });
});
