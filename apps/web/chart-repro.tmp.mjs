import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
echarts.use([LineChart, GridComponent, TooltipComponent, VisualMapComponent, SVGRenderer]);

const start = Date.parse('2026-11-08T12:15:00Z');
const points = Array.from({ length: 289 }, (_, i) => [
  new Date(start + i * 300_000).toISOString(),
  i < 264 ? null : (i % 7) - 2,
]);
for (const variant of ['as-written', 'no-visualMap', 'no-tooltip', 'allNull']) {
  try {
    const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 400, height: 200 });
    const option = {
      tooltip: variant === 'no-tooltip' ? undefined : { trigger: 'axis' },
      xAxis: { type: 'time' },
      yAxis: { type: 'value' },
      visualMap:
        variant === 'no-visualMap'
          ? undefined
          : {
              show: false,
              dimension: 1,
              pieces: [
                { gt: 0, color: '#293d66' },
                { lte: 0, color: '#189c71' },
              ],
            },
      series: [
        {
          type: 'line',
          showSymbol: false,
          connectNulls: false,
          areaStyle: { opacity: 0.25 },
          data: variant === 'allNull' ? points.map(([t]) => [t, null]) : points,
        },
      ],
    };
    chart.setOption(option, true);
    chart.renderToSVGString();
    console.log(variant, 'ok');
  } catch (e) {
    console.log(variant, 'ERROR', e.message, e.stack.split('\n').slice(1, 4).join(' | '));
  }
}
