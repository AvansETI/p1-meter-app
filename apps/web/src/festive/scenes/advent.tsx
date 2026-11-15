import { AdventWreath } from './library';
import { Fig, Figures } from './parts';

/** Advent wreath with one more candle lit each Advent Sunday. */
export function Advent({ lit }: { lit: number }) {
  return (
    <Figures>
      <Fig s={34}>
        <AdventWreath lit={lit} />
      </Fig>
    </Figures>
  );
}
