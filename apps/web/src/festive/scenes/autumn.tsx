/** Halloween, Divali, Sint-Maarten, Loy Krathong, Sinterklaas and Chanoeka (#66). */
import * as L from './library';
import { Edge, Falling, Fig, Figures, Walker } from './parts';

function Pumpkin() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 8C12 5 13 3.5 15 2.5"
        stroke="#3f6b24"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="7.5" cy="15" rx="5.5" ry="7" fill="#d2611a" />
      <ellipse cx="16.5" cy="15" rx="5.5" ry="7" fill="#d2611a" />
      <ellipse cx="12" cy="15" rx="5" ry="7.5" fill="#f08a2c" />
      <g className="fx-flicker" fill="#ffd54a">
        <path d="M7.6 11.5l2.1 2.8H5.5z" />
        <path d="M16.4 11.5l2.1 2.8h-4.2z" />
        <path d="M6.5 17.2h11l-1.6 2.6-1.4-1.2-1.5 1.4-1.5-1.4-1.5 1.4-1.4-1.2z" />
      </g>
    </svg>
  );
}

export function Halloween() {
  return (
    <>
      <Edge kind="vine" />
      <Figures>
        <Fig fx="sway-low" s={18}>
          <Pumpkin />
        </Fig>
        <Fig fx="sway-low" d={-1.1} s={26}>
          <Pumpkin />
        </Fig>
        <Fig fx="sway-low" d={-0.6} s={16}>
          <Pumpkin />
        </Fig>
        <Fig s={16}>
          <L.Owl />
        </Fig>
      </Figures>
    </>
  );
}

function Diya() {
  return (
    <svg viewBox="0 0 24 24">
      <g className="fx-flame">
        <path d="M12 3c3 4 2.6 8.2 0 9.6C9.4 11.2 9 7 12 3z" fill="#ff9800" />
        <path d="M12 7c1.4 2 1.2 4.3 0 5-1.2-.7-1.4-3 0-5z" fill="#ffe082" />
      </g>
      <path d="M2.5 15.5Q12 25 21.5 15.5z" fill="#b8552a" />
      <ellipse cx="12" cy="15.5" rx="9.5" ry="2" fill="#8a3a1a" />
    </svg>
  );
}

function Rangoli() {
  const petals = ['#ff4081', '#ff9800', '#7c4dff', '#00bfa5'];
  return (
    <svg viewBox="0 0 24 24">
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse
          key={i}
          cx="12"
          cy="5.5"
          rx="2.6"
          ry="5"
          fill={petals[i % petals.length]}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="3.2" fill="#ffd54a" />
      <circle cx="12" cy="12" r="1.4" fill="#e53935" />
    </svg>
  );
}

export function Diwali() {
  return (
    <>
      <Falling count={9} fx="twinkle-static" s={6}>
        <L.Star />
      </Falling>
      <Figures>
        <Fig s={20}>
          <Diya />
        </Fig>
        <Fig fx="spin" s={22}>
          <Rangoli />
        </Fig>
        <Fig s={20} d={-0.4}>
          <Diya />
        </Fig>
        <Fig s={20} d={-0.8}>
          <Diya />
        </Fig>
      </Figures>
    </>
  );
}

function Lampion({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 30">
      <path d="M12 0v6" stroke="rgba(255,255,255,.7)" strokeWidth="1" />
      <rect x="8" y="6" width="8" height="2" rx="1" fill="#333" />
      <ellipse cx="12" cy="17" rx="9" ry="9" fill={colour} />
      <ellipse className="fx-glow" cx="12" cy="17" rx="5" ry="6" fill="#fff59d" opacity=".75" />
      {[11, 14, 17, 20, 23].map((y) => (
        <path key={y} d={`M3.5 ${y}h17`} stroke="rgba(0,0,0,.15)" strokeWidth=".8" />
      ))}
      <rect x="9" y="25.5" width="6" height="1.6" rx=".8" fill="#333" />
    </svg>
  );
}

export function StMartin() {
  return (
    <>
      <Falling count={9} fx="twinkle-static" s={6}>
        <L.Star />
      </Falling>
      <Figures>
        <Fig fx="sway" hang s={20}>
          <Lampion colour="#ff7043" />
        </Fig>
        <Fig fx="sway" hang d={-1.3} s={24}>
          <Lampion colour="#42a5f5" />
        </Fig>
        <Fig fx="sway" hang d={-0.5} s={18}>
          <Lampion colour="#ab47bc" />
        </Fig>
        <Fig fx="sway" d={-0.9} s={16} hang>
          <L.Lantern c="#ffca28" />
        </Fig>
      </Figures>
    </>
  );
}

function Krathong() {
  return (
    <svg viewBox="0 0 24 24">
      <g className="fx-flame">
        <path d="M12 2c1.6 2.3 1.4 4.4 0 5.2-1.4-.8-1.6-2.9 0-5.2z" fill="#ffb300" />
      </g>
      <rect x="11.3" y="7" width="1.4" height="5" fill="#fff3e0" />
      <path d="M5 13l3-4 2 4 2-5 2 5 2-4 3 4z" fill="#ff8f00" />
      <path d="M2 14Q12 22 22 14L20.5 12.5H3.5z" fill="#2e7d32" />
      <path d="M4 13.5Q12 19 20 13.5" stroke="#66bb6a" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function LoyKrathong() {
  return (
    <>
      <Edge kind="water" />
      <Figures>
        <Fig fx="bob" s={22} className="festive__fig--float">
          <Krathong />
        </Fig>
        <Fig fx="bob" d={-1.2} s={18} className="festive__fig--float">
          <Krathong />
        </Fig>
        <Fig fx="bob" d={-0.6} s={24} className="festive__fig--float">
          <Krathong />
        </Fig>
        <Fig fx="sway" s={12} hang>
          <L.Lantern c="#ffb300" />
        </Fig>
      </Figures>
    </>
  );
}

export function Present({ box, ribbon }: { box: string; ribbon: string }) {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 7C9 3 6 4 7.5 6.5 8.5 8 12 7 12 7zM12 7c3-4 6-3 4.5-.5C15.5 8 12 7 12 7z"
        fill={ribbon}
      />
      <rect x="3" y="7" width="18" height="4" rx="1" fill={box} />
      <rect x="4" y="11" width="16" height="11" fill={box} />
      <rect x="10.5" y="7" width="3" height="15" fill={ribbon} />
      <rect x="4" y="11" width="16" height="1" fill="rgba(0,0,0,.15)" />
    </svg>
  );
}

/**
 * The roetveegpiet on the way, side by side with the sack over its shoulder; legs in step.
 * Walks inside a `Walker`, which turns it round (#75).
 */
export function WalkingPiet() {
  return (
    <svg viewBox="0 0 26 34">
      <g className="fx-step">
        <path d="M11 25v6.5" stroke="#5e35b1" strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="12" cy="32" rx="2.2" ry="1.2" fill="#212121" />
      </g>
      <g className="fx-step-alt">
        <path d="M15 25v6.5" stroke="#4527a0" strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="16" cy="32" rx="2.2" ry="1.2" fill="#212121" />
      </g>
      <g className="fx-walk-bob">
        <path d="M2.5 15q-2-7 4.5-8.5 5 .5 4.5 6-1.5 4.5-5.5 4.5-2.6 0-3.5-2z" fill="#8d6e63" />
        <path d="M7 7l2.5-2" stroke="#6d4c41" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7 26c.5-5 3-7.5 6-7.5s5.5 2.5 6 7.5z" fill="#1e88e5" />
        <path d="M8.6 19.4Q13 22.4 17.4 19.4 13 17.6 8.6 19.4z" fill="#fff" />
        <circle cx="13" cy="13.2" r="5.2" fill="#e9b48c" />
        <circle cx="15" cy="12.6" r=".7" fill="#3e2723" />
        <path
          d="M13.8 15.4q1.6 1.2 3 0"
          stroke="#8d3a2a"
          strokeWidth=".8"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse
          cx="10.8"
          cy="14.6"
          rx="1.3"
          ry=".6"
          fill="#4a4a4a"
          opacity=".55"
          transform="rotate(-20 10.8 14.6)"
        />
        <ellipse
          cx="16.4"
          cy="10.8"
          rx=".9"
          ry=".45"
          fill="#4a4a4a"
          opacity=".5"
          transform="rotate(25 16.4 10.8)"
        />
        <path d="M7.6 10Q9.6 5.4 14.2 6q4.6.6 5 4-5.6-1.4-11.6 0z" fill="#d81b60" />
        <path
          className="fx-feather"
          d="M8.8 7.2c-2.2-3.2-4.6-4.2-6-4.2.9 1.8 2.8 4.2 5.6 5.2z"
          fill="#fdd835"
        />
        <path d="M17 21l3.4 3.4" stroke="#1e88e5" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="21" cy="25" r="1.5" fill="#e9b48c" />
      </g>
    </svg>
  );
}

function Mitre() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 22V10Q5 5 12 1.5 19 5 19 10v12z" fill="#c62828" />
      <path d="M5 19h14v3H5z" fill="#ffca28" />
      <path d="M12 1.5V19" stroke="#ffca28" strokeWidth="1.6" />
      <path d="M10 9h4M12 7v5" stroke="#ffca28" strokeWidth="1.8" />
    </svg>
  );
}

function Crosier() {
  return (
    <svg viewBox="0 0 16 30">
      <path d="M8 29V9" stroke="#ffca28" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8 9C8 3 14 2 14 6.5 14 9 11 9.5 10 8"
        stroke="#ffca28"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Three presents in a row, the most telling figures after the mitre or shoe. */
export function Presents() {
  return (
    <>
      <Fig fx="hop" s={16}>
        <Present box="#e53935" ribbon="#ffd54a" />
      </Fig>
      <Fig fx="hop" d={0.4} s={18}>
        <Present box="#43a047" ribbon="#ffffff" />
      </Fig>
      <Fig fx="hop" d={0.8} s={14}>
        <Present box="#8e24aa" ribbon="#ffca28" />
      </Fig>
    </>
  );
}

/** Pakjesavond (1–5 December): mitre, crosier, presents, pepernoten and the walking piet. */
export function Sinterklaas() {
  return (
    <>
      <Falling count={10} s={8}>
        <L.Pepernoot />
      </Falling>
      <Figures>
        <Fig fx="bob" s={20}>
          <Mitre />
        </Fig>
        <Fig fx="sway-low" s={14} d={-0.8}>
          <Crosier />
        </Fig>
        <Presents />
      </Figures>
      <Walker s={22}>
        <WalkingPiet />
      </Walker>
    </>
  );
}

/** Menorah with the shamash and `night` candles lit (added from right to left). */
function Menorah({ night }: { night: number }) {
  const candles = Array.from({ length: 9 }, (_, i) => i);
  const x = (i: number) => 4 + i * 4;
  return (
    <svg viewBox="0 0 40 26">
      <path d="M20 13v10M14 25h12" stroke="#ffca28" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 13q16 10 32 0" stroke="#ffca28" strokeWidth="1.4" fill="none" />
      <path d="M4 13h32" stroke="#ffca28" strokeWidth="1.2" />
      {candles.map((i) => {
        const shamash = i === 4;
        // Candle positions without the shamash: 0..7 from left; lit from the right.
        const slot = i < 4 ? i : i - 1;
        const lit = shamash || slot >= 8 - night;
        const top = shamash ? 3 : 7;
        return (
          <g key={i}>
            <rect x={x(i) - 0.9} y={top} width="1.8" height={13 - top} fill="#e3f2fd" />
            {lit && (
              <path
                className="fx-flame"
                style={{ animationDelay: `${-i * 0.23}s` }}
                d={`M${x(i)} ${top - 4}c1.3 1.8 1.1 3.3 0 3.9-1.1-.6-1.3-2.1 0-3.9z`}
                fill="#ffb300"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Hanukkah({ night }: { night: number }) {
  return (
    <Figures>
      <Fig s={40} className="festive__fig--wide">
        <Menorah night={night} />
      </Fig>
    </Figures>
  );
}
