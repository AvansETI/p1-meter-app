import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSettings } from '../settings/context';
import { startFireworks } from './fireworks';
import { activeSeason, seasonOverride, type Season } from './season';

/** Read once at startup: navigating inside the app drops the query string. */
const override = typeof window === 'undefined' ? undefined : seasonOverride(window.location.search);

const BULBS = 64; // 32 px apart: enough for a 2048 px wide title bar
const BAUBLES = 3;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The season to show now; re-checked every minute, so an open app switches at midnight. */
function useSeason(): Season | null {
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return activeSeason({ override, enabled: settings.festive, now });
}

function ChristmasLights() {
  return (
    <>
      <div className="festive__lights">
        {Array.from({ length: BULBS }, (_, i) => (
          <span
            key={i}
            className={`festive__bulb festive__bulb--${i % 4}`}
            // Scattered delays, so neighbouring bulbs never blink together.
            style={{ '--delay': `${-((i * 7) % 11) * 0.15}s` } as CSSProperties}
          />
        ))}
      </div>
      {Array.from({ length: BAUBLES }, (_, i) => (
        <span key={i} className={`festive__bauble festive__bauble--${i}`} />
      ))}
    </>
  );
}

function Fireworks() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => (canvas.current ? startFireworks(canvas.current) : undefined), []);
  return <canvas ref={canvas} className="festive__fireworks" />;
}

/** The decoration itself, for a given season (#62). */
export function Decoration({ season }: { season: Season }) {
  return (
    <div className={`festive festive--${season}`} aria-hidden="true">
      {season === 'christmas' ? <ChristmasLights /> : !reducedMotion() && <Fireworks />}
    </div>
  );
}

/**
 * Holiday decoration over a main page's title bar: lights and baubles at Christmas,
 * fireworks around New Year (docs/design/2026-11-14-festive-decoration.md). Place it in the
 * IonHeader, after the IonToolbar.
 */
export default function FestiveDecoration() {
  const season = useSeason();
  return season ? <Decoration season={season} /> : null;
}
