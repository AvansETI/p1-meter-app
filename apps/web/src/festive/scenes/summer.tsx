/** King's Day, Liberation Day, the longest day, Keti Koti and Pride (#66). */
import { Bunting, Fig, Figures } from './parts';

function Crown() {
  return (
    <svg viewBox="0 0 28 22">
      <defs>
        <clipPath id="festive-crown">
          <path d="M2 8l6 5 6-10 6 10 6-5-2 12H4z" />
        </clipPath>
      </defs>
      <path d="M2 8l6 5 6-10 6 10 6-5-2 12H4z" fill="#ffc107" />
      <rect x="4" y="17" width="20" height="3" fill="#ffa000" />
      <circle cx="14" cy="13" r="1.8" fill="#e53935" />
      <circle cx="8.5" cy="15" r="1.2" fill="#1e88e5" />
      <circle cx="19.5" cy="15" r="1.2" fill="#1e88e5" />
      <circle cx="2" cy="7.5" r="1.3" fill="#ffc107" />
      <circle cx="14" cy="2.5" r="1.3" fill="#ffc107" />
      <circle cx="26" cy="7.5" r="1.3" fill="#ffc107" />
      <g clipPath="url(#festive-crown)">
        <rect
          className="fx-shine"
          x="-8"
          y="0"
          width="5"
          height="22"
          fill="rgba(255,255,255,.75)"
          transform="skewX(-20)"
        />
      </g>
    </svg>
  );
}

export function KingsDay() {
  return (
    <>
      <Bunting colours={['#ff6d00', '#ff9100', '#ffab40']} />
      <Figures>
        <Fig fx="bob" s={26}>
          <Crown />
        </Fig>
      </Figures>
    </>
  );
}

function Flame() {
  return (
    <svg viewBox="0 0 16 28">
      <g className="fx-flame">
        <path d="M8 1c5 6 6 11 3 15-1 1.5-5 1.5-6 0C2 12 3 7 8 1z" fill="#ff7043" />
        <path
          d="M8 7c2.5 3.5 2.8 6.5 1.3 8.4-.6.8-2 .8-2.6 0C5.2 13.5 5.5 10.5 8 7z"
          fill="#ffd54a"
        />
      </g>
      <path d="M4 17h8l-1.5 10h-5z" fill="#90a4ae" />
      <path d="M3 17h10" stroke="#b0bec5" strokeWidth="1.4" />
    </svg>
  );
}

export function Liberation() {
  return (
    <>
      <Bunting colours={['#ae1c28', '#ffffff', '#21468b']} />
      <Figures>
        <Fig s={14}>
          <Flame />
        </Fig>
      </Figures>
    </>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 28 28">
      <g className="fx-spin" stroke="#ffd54a" strokeWidth="1.8" strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M14 1.5v4" transform={`rotate(${i * 30} 14 14)`} />
        ))}
      </g>
      <circle cx="14" cy="14" r="6.5" fill="#ffca28" />
    </svg>
  );
}

function SolarPanel() {
  return (
    <svg viewBox="0 0 30 20">
      <defs>
        <clipPath id="festive-panel">
          <path d="M6 2h22l-4 14H2z" />
        </clipPath>
      </defs>
      <path d="M6 2h22l-4 14H2z" fill="#1a237e" />
      <path
        d="M11.5 2l-4 14M17 2l-4 14M22.5 2l-4 14M4.8 6.7h22M3.6 11.3h22"
        stroke="#5c6bc0"
        strokeWidth=".7"
      />
      <g clipPath="url(#festive-panel)">
        <rect
          className="fx-shine"
          x="-8"
          y="0"
          width="5"
          height="20"
          fill="rgba(255,255,255,.6)"
          transform="skewX(-20)"
        />
      </g>
      <path d="M13 16v3M9 19h8" stroke="#90a4ae" strokeWidth="1.2" />
    </svg>
  );
}

export function Solstice() {
  return (
    <Figures>
      <Fig fx="rise" s={26}>
        <Sun />
      </Fig>
      <Fig s={26}>
        <SolarPanel />
      </Fig>
    </Figures>
  );
}

/** Keti Koti: koto and angisa prints as a quiet, slowly moving cloth. */
export function KetiKoti() {
  return (
    <Bunting
      slow
      colours={[
        'repeating-linear-gradient(45deg,#c62828 0 3px,#fdd835 3px 6px)',
        'repeating-linear-gradient(90deg,#2e7d32 0 4px,#fafafa 4px 6px,#1565c0 6px 9px)',
        'repeating-linear-gradient(-45deg,#6a1b9a 0 3px,#ff8f00 3px 6px)',
        'repeating-linear-gradient(0deg,#00838f 0 3px,#fafafa 3px 5px,#c62828 5px 8px)',
      ]}
    />
  );
}

export function Pride() {
  return (
    <>
      <Bunting colours={['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982']} />
      <Figures>
        <Fig fx="beat" s={18}>
          <svg viewBox="0 0 24 22">
            <defs>
              <linearGradient id="festive-rainbow" x1="0" y1="0" x2="0" y2="1">
                {['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'].map(
                  (colour, i) => (
                    <stop key={colour} offset={`${(i / 6) * 100}%`} stopColor={colour} />
                  ),
                )}
              </linearGradient>
            </defs>
            <path
              d="M12 21S1 14 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 7-11 14-11 14z"
              fill="url(#festive-rainbow)"
            />
          </svg>
        </Fig>
      </Figures>
    </>
  );
}
