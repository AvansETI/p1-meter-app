/**
 * The vertical hairline that follows the mouse or finger, the same in every chart: on a phone
 * it shows where you are while swiping over the chart. A bar chart gets it too, instead of a
 * shaded band.
 */
export function hairline(color: string) {
  return {
    type: 'line' as const,
    lineStyle: { color, width: 1, type: 'dashed' as const },
  };
}
