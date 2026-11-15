import { IonPopover } from '@ionic/react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../settings/context';
import { startFireworks } from './fireworks';
import { Diwali, Halloween, Hanukkah, LoyKrathong, Sinterklaas, StMartin } from './scenes/autumn';
import {
  Carnival,
  EarthDay,
  EarthHour,
  Easter,
  Eid,
  Holi,
  LunarNewYear,
  Nowruz,
  Songkran,
  Valentine,
  WarmSweater,
} from './scenes/spring';
import { KetiKoti, KingsDay, Liberation, Pride, Solstice } from './scenes/summer';
import { Advent } from './scenes/advent';
import { MORE_SCENES } from './scenes/more';
import { activeSeason, adventCandles, hanukkahNight, seasonOverride, type Season } from './season';
import './festive.css';

/** Read once at startup: navigating inside the app drops the query string. */
const override = typeof window === 'undefined' ? undefined : seasonOverride(window.location.search);

const BULBS = 64; // 32 px apart: enough for a 2048 px wide title bar
const BAUBLES = 3;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The season to show now; re-checked every minute, so an open app switches at midnight. */
function useSeason(): { season: Season | null; now: Date } {
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return { season: activeSeason({ override, enabled: settings.festive, now }), now };
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

const SCENES: Partial<Record<Season, () => ReactNode>> = {
  ...MORE_SCENES,
  lunarnewyear: LunarNewYear,
  sweater: WarmSweater,
  valentine: Valentine,
  carnival: Carnival,
  eidfitr: Eid,
  holi: Holi,
  nowruz: Nowruz,
  earthhour: EarthHour,
  easter: Easter,
  songkran: Songkran,
  earthday: EarthDay,
  kingsday: KingsDay,
  eidadha: Eid,
  liberation: Liberation,
  solstice: Solstice,
  ketikoti: KetiKoti,
  pride: Pride,
  halloween: Halloween,
  diwali: Diwali,
  stmartin: StMartin,
  loykrathong: LoyKrathong,
  sinterklaas: Sinterklaas,
};

function Scene({ season, now }: { season: Season; now: Date }) {
  if (season === 'christmas') return <ChristmasLights />;
  if (season === 'newyear') return reducedMotion() ? null : <Fireworks />;
  // A preview outside Chanoeka shows all candles.
  if (season === 'hanukkah') return <Hanukkah night={hanukkahNight(now)} />;
  if (season === 'advent') return <Advent lit={adventCandles(now)} />;
  const Picture = SCENES[season];
  return Picture ? <Picture /> : null;
}

const INFO_MS = 10_000;

/** A button over the decoration that tells what the holiday is about (#66). */
function HolidayInfo({ season }: { season: Season }) {
  const { t } = useTranslation();
  const [event, setEvent] = useState<MouseEvent | undefined>();

  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(() => setEvent(undefined), INFO_MS);
    return () => clearTimeout(timer);
  }, [event]);

  const name = t(`festive.${season}.name`);
  return (
    <>
      <button
        type="button"
        className="festive__info"
        aria-label={t('festive.about', { name })}
        onClick={(e) => setEvent(e.nativeEvent)}
      />
      <IonPopover
        isOpen={event !== undefined}
        event={event}
        onDidDismiss={() => setEvent(undefined)}
        className="festive-popover"
      >
        <div className="festive-info">
          <strong>{name}</strong>
          <p>{t(`festive.${season}.about`)}</p>
        </div>
      </IonPopover>
    </>
  );
}

/** The decoration itself, for a given season (#62, #66). */
export function Decoration({ season, now = new Date() }: { season: Season; now?: Date }) {
  return (
    <>
      <div className={`festive festive--${season}`} aria-hidden="true">
        <Scene season={season} now={now} />
      </div>
      <HolidayInfo season={season} />
    </>
  );
}

/**
 * Holiday decoration over a main page's title bar, with information about the holiday on
 * tap (docs/design/2026-11-14-festive-decoration.md, 2026-11-15-more-festive-seasons.md).
 * Place it in the IonHeader, after the IonToolbar.
 */
export default function FestiveDecoration() {
  const { season, now } = useSeason();
  return season ? <Decoration season={season} now={now} /> : null;
}
