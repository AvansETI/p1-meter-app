/**
 * Chinese New Year, Warme Truiendag, Valentine's Day, carnival, Suikerfeest/Offerfeest, Holi,
 * Nowruz, Earth Hour, Easter, Songkran and Earth Day (#66).
 */
import { Fig, Figures, Traveller } from './parts';

function RedLantern() {
  return (
    <svg viewBox="0 0 24 32">
      <path d="M12 0v5" stroke="#ffca28" strokeWidth="1" />
      <rect x="7" y="5" width="10" height="2.5" rx="1" fill="#ffca28" />
      <ellipse cx="12" cy="15" rx="10" ry="8" fill="#e53935" />
      <path
        d="M12 7v16M7 8q-3 7 0 14M17 8q3 7 0 14"
        stroke="#b71c1c"
        strokeWidth=".9"
        fill="none"
      />
      <ellipse className="fx-glow" cx="12" cy="15" rx="5" ry="5" fill="#ff8a65" opacity=".6" />
      <rect x="7" y="22.5" width="10" height="2.5" rx="1" fill="#ffca28" />
      <path d="M12 25v6M10.5 31h3" stroke="#ffca28" strokeWidth="1.2" />
    </svg>
  );
}

function Dragon() {
  return (
    <svg viewBox="0 0 64 22">
      <path
        d="M2 12q6-8 12 0t12 0 12 0 12 0"
        stroke="#e53935"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M2 12q6-8 12 0t12 0 12 0 12 0"
        stroke="#ffca28"
        strokeWidth="1.4"
        strokeDasharray="2 3"
        fill="none"
      />
      <path d="M48 7l10-1 4 5-3 5-11-1z" fill="#e53935" />
      <path d="M58 6l3-4M55 6l1-5" stroke="#ffca28" strokeWidth="1.2" />
      <circle cx="57" cy="9.5" r="1.1" fill="#fff" />
      <path d="M62 14q2 4-1 7M60 15q0 4-3 6" stroke="#ffca28" strokeWidth=".8" fill="none" />
    </svg>
  );
}

export function LunarNewYear() {
  return (
    <>
      <Figures>
        <Fig fx="sway" hang s={18}>
          <RedLantern />
        </Fig>
        <Fig fx="sway" hang d={-1} s={22}>
          <RedLantern />
        </Fig>
        <Fig fx="sway" hang d={-0.4} s={16}>
          <RedLantern />
        </Fig>
      </Figures>
      <Traveller s={58}>
        <Dragon />
      </Traveller>
    </>
  );
}

function Sweater() {
  return (
    <svg viewBox="0 0 28 24">
      <path d="M8 3l-7 5 3 6 3-2v11h14V12l3 2 3-6-7-5q-3 3-6 0z" fill="#c62828" />
      <path d="M7 12h14" stroke="#fff" strokeWidth="1.4" strokeDasharray="1.5 1.5" />
      <path d="M7 15l2 2 2-2 2 2 2-2 2 2 2-2 2 2" stroke="#fff" strokeWidth="1" fill="none" />
      <path d="M11 3q3 3 6 0" stroke="#8e0000" strokeWidth="1.2" fill="none" />
      <rect x="9.5" y="1" width="2" height="4" rx=".6" fill="#ffca28" />
      <rect x="16.5" y="1" width="2" height="4" rx=".6" fill="#ffca28" />
    </svg>
  );
}

function Thermometer() {
  return (
    <svg viewBox="0 0 12 28">
      <rect x="4" y="1" width="4" height="20" rx="2" fill="#eceff1" />
      <rect className="fx-drop" x="5" y="4" width="2" height="17" fill="#e53935" />
      <circle cx="6" cy="23" r="4" fill="#e53935" />
      <path d="M8.5 6h2M8.5 10h2M8.5 14h2" stroke="#eceff1" strokeWidth=".8" />
    </svg>
  );
}

export function WarmSweater() {
  return (
    <Figures line>
      <Fig fx="flutter" hang s={24}>
        <Sweater />
      </Fig>
      <Fig s={10}>
        <Thermometer />
      </Fig>
    </Figures>
  );
}

function Heart({ colour = '#e91e63' }: { colour?: string }) {
  return (
    <svg viewBox="0 0 24 22">
      <path
        d="M12 21S1 14 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 7-11 14-11 14z"
        fill={colour}
      />
    </svg>
  );
}

export function Valentine() {
  return (
    <Figures>
      <Fig fx="beat" s={20}>
        <Heart />
      </Fig>
      <Fig fx="float-up" s={12} d={0}>
        <Heart colour="#f06292" />
      </Fig>
      <Fig fx="float-up" s={10} d={-1.3}>
        <Heart colour="#ff8a80" />
      </Fig>
      <Fig fx="float-up" s={14} d={-2.4}>
        <Heart />
      </Fig>
    </Figures>
  );
}

/** Boerenkiel: the blue farmer's smock worn at carnival, with a red neckerchief. */
function Boerenkiel() {
  return (
    <svg viewBox="0 0 28 26">
      <path d="M9 3L1 8l3 6 3-2v13h14V12l3 2 3-6-8-5z" fill="#1565c0" />
      <path d="M7 12v13M21 12v13" stroke="#0d47a1" strokeWidth=".8" />
      <path d="M10 3q4 6 8 0" fill="#e53935" />
      <path d="M12 5.5l2 4 2-4" fill="#e53935" />
      <path d="M9 9.5h10" stroke="#fff" strokeWidth=".8" strokeDasharray="1 1" />
      <rect x="8" y="1" width="2" height="4" rx=".6" fill="#ffca28" />
      <rect x="18" y="1" width="2" height="4" rx=".6" fill="#ffca28" />
    </svg>
  );
}

function BeerGlass() {
  return (
    <svg viewBox="0 0 16 26">
      <path d="M2 6h12l-1.5 19h-9z" fill="#ffb300" />
      <path d="M2 6h12l-.3 3H2.3z" fill="#fff8e1" />
      <ellipse cx="8" cy="5.5" rx="6.5" ry="2.5" fill="#fffdf6" />
      <path d="M2 6h12l-1.5 19h-9z" stroke="rgba(255,255,255,.75)" strokeWidth=".8" fill="none" />
      {[5, 8, 11].map((x, i) => (
        <circle
          key={x}
          className="fx-bubble"
          style={{ animationDelay: `${-i * 0.5}s` }}
          cx={x}
          cy="22"
          r=".8"
          fill="#fff8e1"
        />
      ))}
    </svg>
  );
}

export function Carnival() {
  return (
    <Figures line>
      <Fig fx="flutter" hang s={24}>
        <Boerenkiel />
      </Fig>
      <Fig fx="flutter" hang d={-0.9} s={22}>
        <Boerenkiel />
      </Fig>
      <Fig fx="clink-left" s={11}>
        <BeerGlass />
      </Fig>
      <Fig fx="clink-right" s={11}>
        <BeerGlass />
      </Fig>
    </Figures>
  );
}

function Crescent() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M15 2a10 10 0 1 0 7 17A8 8 0 1 1 15 2z" fill="#ffd54a" />
    </svg>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 1l3 7.5 8 .6-6.1 5.2 1.9 7.9L12 17.8 5.2 22.2l1.9-7.9L1 9.1l8-.6z"
        fill="#fff59d"
      />
    </svg>
  );
}

/** Fanous: a lantern with coloured glass. */
function Fanous() {
  return (
    <svg viewBox="0 0 20 32">
      <path d="M10 0v4" stroke="rgba(255,255,255,.7)" strokeWidth="1" />
      <path d="M10 4l5 5H5z" fill="#ffca28" />
      <path d="M5 9h10l2 6-2 8H5l-2-8z" fill="#00897b" />
      <path className="fx-glow" d="M7 11h6l1 4-1 6H7l-1-6z" fill="#fff59d" />
      <path d="M5 23h10l-2 4H7z" fill="#ffca28" />
      <path d="M10 9v14M3 15h14" stroke="#ffca28" strokeWidth=".8" />
    </svg>
  );
}

/** Suikerfeest and Offerfeest. */
export function Eid() {
  return (
    <Figures>
      <Fig s={20}>
        <Crescent />
      </Fig>
      <Fig fx="twinkle" s={9}>
        <Star />
      </Fig>
      <Fig fx="twinkle" d={-0.7} s={7}>
        <Star />
      </Fig>
      <Fig fx="sway" hang d={-0.3} s={14}>
        <Fanous />
      </Fig>
      <Fig fx="sway" hang d={-1.4} s={12}>
        <Fanous />
      </Fig>
    </Figures>
  );
}

function Puff({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 24">
      <g fill={colour}>
        <circle cx="12" cy="12" r="6" />
        <circle cx="6" cy="10" r="3.5" />
        <circle cx="18" cy="9" r="3.5" />
        <circle cx="9" cy="18" r="3" />
        <circle cx="16" cy="17" r="3.2" />
        <circle cx="12" cy="4" r="2" opacity=".7" />
        <circle cx="3" cy="17" r="1.5" opacity=".7" />
        <circle cx="21" cy="16" r="1.5" opacity=".7" />
      </g>
    </svg>
  );
}

export function Holi() {
  return (
    <Figures>
      {['#ff4081', '#ffeb3b', '#00e676', '#40c4ff', '#d500f9'].map((colour, i) => (
        <Fig key={colour} fx="burst" d={-i * 0.55} s={20}>
          <Puff colour={colour} />
        </Fig>
      ))}
    </Figures>
  );
}

function Sabzeh() {
  return (
    <svg viewBox="0 0 24 24">
      <g className="fx-grow" stroke="#66bb6a" strokeWidth="1.4" strokeLinecap="round">
        {[5, 7.5, 10, 12.5, 15, 17.5, 20].map((x, i) => (
          <path
            key={x}
            d={`M${x} 17Q${x + (i % 2 ? 1.5 : -1.5)} 9 ${x} ${3 + (i % 3) * 2}`}
            fill="none"
          />
        ))}
      </g>
      <path d="M2 17h20l-2 5H4z" fill="#ef6c00" />
      <path d="M8 16.5q4 2 8 0" stroke="#e53935" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function FishBowl() {
  return (
    <svg viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="13"
        r="10"
        fill="rgba(144,202,249,.35)"
        stroke="rgba(255,255,255,.7)"
        strokeWidth="1"
      />
      <path d="M3 12h18" stroke="rgba(255,255,255,.5)" strokeWidth=".8" />
      <g className="fx-swim">
        <ellipse cx="12" cy="15" rx="3.5" ry="2" fill="#ff7043" />
        <path d="M8.6 15l-2.4-2v4z" fill="#ff7043" />
        <circle cx="14" cy="14.6" r=".5" fill="#263238" />
      </g>
    </svg>
  );
}

export function Nowruz() {
  return (
    <Figures>
      <Fig s={22}>
        <Sabzeh />
      </Fig>
      <Fig s={22}>
        <FishBowl />
      </Fig>
    </Figures>
  );
}

function Bulb() {
  return (
    <svg viewBox="0 0 20 28">
      <circle className="fx-onoff" cx="10" cy="10" r="10" fill="#fff59d" opacity=".35" />
      <path
        className="fx-onoff"
        d="M10 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 10 2z"
        fill="#ffee58"
      />
      <path
        d="M10 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 10 2z"
        fill="none"
        stroke="#fff"
        strokeWidth=".9"
      />
      <path d="M7 10l1.5 2 1.5-2 1.5 2 1.5-2" stroke="#8d6e63" strokeWidth=".7" fill="none" />
      <rect x="6.5" y="18" width="7" height="5" rx="1" fill="#b0bec5" />
      <path d="M6.5 20h7M6.5 22h7" stroke="#78909c" strokeWidth=".6" />
    </svg>
  );
}

export function EarthHour() {
  return (
    <Figures>
      <Fig s={16}>
        <Bulb />
      </Fig>
    </Figures>
  );
}

function Egg({ colour, pattern }: { colour: string; pattern: 'stripes' | 'dots' | 'zigzag' }) {
  return (
    <svg viewBox="0 0 20 24">
      <path d="M10 1C4 1 1 10 1 15a9 9 0 0 0 18 0c0-5-3-14-9-14z" fill={colour} />
      {pattern === 'stripes' && <path d="M2 11h16M1.5 16h17" stroke="#fff" strokeWidth="1.6" />}
      {pattern === 'dots' &&
        [
          [6, 9],
          [13, 8],
          [9, 14],
          [15, 16],
          [5, 18],
        ].map(([cx, cy]) => <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="1.4" fill="#fff" />)}
      {pattern === 'zigzag' && (
        <path d="M1.5 13l3-3 3 3 3-3 3 3 3-3 2 2" stroke="#fff" strokeWidth="1.3" fill="none" />
      )}
    </svg>
  );
}

function Hare() {
  return (
    <svg viewBox="0 0 30 24">
      <ellipse cx="14" cy="16" rx="9" ry="6.5" fill="#d7ccc8" />
      <circle cx="5" cy="14" r="2.4" fill="#fff" />
      <circle cx="23" cy="11" r="5" fill="#d7ccc8" />
      <path d="M22 7c-1-5 0-7 1.5-7s1.5 4 0 7zM25 7c0-5 2-7 3.2-6.5s0 4-1.8 7z" fill="#d7ccc8" />
      <path d="M22.8 6c-.5-3 0-4.5.6-4.5" stroke="#f8bbd0" strokeWidth="1" fill="none" />
      <circle cx="25" cy="10" r=".8" fill="#3e2723" />
      <circle cx="27.8" cy="12" r=".8" fill="#f48fb1" />
      <ellipse cx="18" cy="21.5" rx="3" ry="1.5" fill="#bcaaa4" />
    </svg>
  );
}

export function Easter() {
  return (
    <>
      <Figures>
        <Fig fx="wobble" s={14}>
          <Egg colour="#ec407a" pattern="stripes" />
        </Fig>
        <Fig fx="wobble" d={-0.5} s={15}>
          <Egg colour="#ffca28" pattern="dots" />
        </Fig>
        <Fig fx="wobble" d={-1} s={13}>
          <Egg colour="#26a69a" pattern="zigzag" />
        </Fig>
        <Fig fx="wobble" d={-1.5} s={14}>
          <Egg colour="#7e57c2" pattern="dots" />
        </Fig>
      </Figures>
      <Traveller s={28}>
        <span className="fx-hop-far">
          <Hare />
        </span>
      </Traveller>
    </>
  );
}

function WaterBowl() {
  return (
    <svg viewBox="0 0 28 24">
      {[
        [6, 0],
        [11, -0.4],
        [17, -0.8],
        [22, -1.2],
      ].map(([x, d]) => (
        <circle
          key={x}
          className="fx-splash"
          style={{ animationDelay: `${d}s` }}
          cx={x}
          cy="14"
          r="1.6"
          fill="#81d4fa"
        />
      ))}
      <path d="M2 14h24q-2 9-12 9T2 14z" fill="#cfd8dc" />
      <path d="M4 15.5h20" stroke="#90a4ae" strokeWidth=".8" />
      <ellipse cx="14" cy="14" rx="12" ry="1.8" fill="#4fc3f7" />
    </svg>
  );
}

export function Songkran() {
  return (
    <Figures>
      <Fig s={26}>
        <WaterBowl />
      </Fig>
      <Fig s={22}>
        <WaterBowl />
      </Fig>
    </Figures>
  );
}

function Globe() {
  return (
    <svg viewBox="0 0 24 24">
      <defs>
        <clipPath id="festive-globe">
          <circle cx="12" cy="12" r="10" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="10" fill="#1e88e5" />
      <g clipPath="url(#festive-globe)">
        <g className="fx-turn" fill="#66bb6a">
          {[0, 24].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <path d="M2 6q4-2 6 1t-1 6-3 5-4-2z" />
              <path d="M12 4q5 0 6 3t-3 5-2 6-3-3 1-5-1-3z" />
              <path d="M19 15q3 0 4 2t-2 3-3-1z" />
            </g>
          ))}
        </g>
      </g>
      <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth=".8" />
    </svg>
  );
}

function Leaf() {
  return (
    <svg viewBox="0 0 20 24">
      <path d="M10 23V10" stroke="#558b2f" strokeWidth="1.4" />
      <path
        className="fx-grow"
        d="M10 12C3 12 1 6 2 2c5 0 9 3 8 10zM10 15c6 0 9-4 8-9-5 0-8 3-8 9z"
        fill="#7cb342"
      />
    </svg>
  );
}

export function EarthDay() {
  return (
    <Figures>
      <Fig s={14}>
        <Leaf />
      </Fig>
      <Fig s={22}>
        <Globe />
      </Fig>
      <Fig s={14} d={-1}>
        <Leaf />
      </Fig>
    </Figures>
  );
}
