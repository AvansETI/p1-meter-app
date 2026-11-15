/** Full-width layers for the scenes (#75): small and few, so the title stays readable. */
import * as L from './library';
import { Falling } from './parts';

export const Hearts = ({ c = '#ff8a80' }: { c?: string }) => (
  <Falling count={7} s={8}>
    <L.Heart c={c} />
  </Falling>
);
export const Stars = () => (
  <Falling count={9} fx="twinkle-static" s={6}>
    <L.Star />
  </Falling>
);
export const Clouds = () => (
  <Falling count={3} fx="float-sky" s={20}>
    <L.Cloud />
  </Falling>
);
export const Leaves = ({ c = '#7cb342' }: { c?: string }) => (
  <Falling count={8} fx="leaf-fall" s={10}>
    <L.Leaf c={c} />
  </Falling>
);
export const Confetti = () => (
  <Falling count={12} s={9}>
    <L.Confetti />
  </Falling>
);
export const Drops = () => (
  <Falling count={8} s={6}>
    <L.Drop />
  </Falling>
);
export const Petals = ({ c = '#f8bbd0' }: { c?: string }) => (
  <Falling count={7} fx="leaf-fall" s={9}>
    <L.Flower c={c} />
  </Falling>
);
