import type { CSSProperties, ReactNode } from 'react';

/** Custom properties for the festive CSS (delay, size, colour). */
const vars = (values: Record<string, string | number>) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      `--${key}`,
      typeof value === 'number' ? `${value}${key === 's' ? 'px' : 's'}` : value,
    ]),
  ) as CSSProperties;

/**
 * One small figure in the free space next to the title. `fx` names the animation (see
 * festive.css), `d` its delay in seconds; `hang` anchors it to the top edge.
 */
export function Fig({
  fx,
  d = 0,
  s = 22,
  hang = false,
  className = '',
  children,
}: {
  fx?: string;
  d?: number;
  s?: number;
  hang?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = ['festive__fig', hang && 'festive__fig--hang', fx && `fx-${fx}`, className];
  return (
    <span className={classes.filter(Boolean).join(' ')} style={vars({ d, s })}>
      {children}
    </span>
  );
}

/** The free space next to the title; `line` adds a washing line along its top. */
export function Figures({ line = false, children }: { line?: boolean; children: ReactNode }) {
  return (
    <div className={line ? 'festive__figures festive__figures--line' : 'festive__figures'}>
      {children}
    </div>
  );
}

/** A figure that travels across the whole title bar now and then (hare, dragon). */
export function Traveller({ s = 26, children }: { s?: number; children: ReactNode }) {
  return (
    <span className="festive__traveller" style={vars({ s })}>
      <span className="festive__traveller-inner">{children}</span>
    </span>
  );
}

/**
 * A figure that walks across the whole title bar, turns round and walks back (the
 * roetveegpiet, #75). Unlike `Traveller` it stays on the bar and faces its direction.
 */
export function Walker({ s = 24, children }: { s?: number; children: ReactNode }) {
  return (
    <span className="festive__walker" style={vars({ s })}>
      <span className="festive__walker-inner">{children}</span>
    </span>
  );
}

/**
 * A handful of small figures thrown together from a walker's hand, each in its own arc, landing
 * up to a quarter of the screen further on; then a pause (pepernoten, #75). Place inside a
 * `Walker`: they turn round with it.
 */
export function Thrown({
  count = 7,
  s = 7,
  children,
}: {
  count?: number;
  s?: number;
  children: ReactNode;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="festive__thrown fx-throw"
          style={{
            ...vars({ s }),
            animationDelay: `${(i % 3) * 0.06}s`,
            // Distance 8–25 % of the screen width and peak height 8–26 px, spread over the hand.
            ['--tx' as string]: `${8 + ((i * 3) % count) * (17 / Math.max(1, count - 1))}vw`,
            ['--h' as string]: `${8 + ((i * 5) % count) * (18 / Math.max(1, count - 1))}px`,
          }}
        >
          {children}
        </span>
      ))}
    </>
  );
}

const FLAGS = 96; // 20 px apart: enough for a 1920 px wide title bar

/** Bunting along the bottom edge; flags take the colours (or backgrounds) in turn. */
export function Bunting({ colours, slow = false }: { colours: string[]; slow?: boolean }) {
  return (
    <div className={slow ? 'festive__bunting festive__bunting--slow' : 'festive__bunting'}>
      {Array.from({ length: FLAGS }, (_, i) => (
        <span
          key={i}
          className="festive__flag"
          style={{
            ...vars({ d: -((i * 7) % 11) * 0.17 }),
            background: colours[i % colours.length],
          }}
        />
      ))}
    </div>
  );
}

/** A plain edge along the bottom (vine, water): drawn and animated in CSS. */
export function Edge({ kind }: { kind: 'vine' | 'water' }) {
  return <div className={`festive__edge festive__edge--${kind}`} />;
}

/** Copies of a small figure falling (or flying) across the whole title bar. */
export function Falling({
  count = 12,
  fx = 'fall',
  s = 10,
  children,
}: {
  count?: number;
  fx?: string;
  s?: number;
  children: ReactNode;
}) {
  return (
    <div className="festive__falling">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`festive__faller fx-${fx}`}
          style={{
            left: `${((i * 37) % 100) + 1}%`,
            width: `${s - (i % 3) * 2}px`,
            animationDelay: `${-((i * 7) % 13) * 0.6}s`,
            animationDuration: `${6 + (i % 5)}s`,
          }}
        >
          {children}
        </span>
      ))}
    </div>
  );
}
