/**
 * Small reusable SVG figures for the festive scenes (#66). Animation classes (`fx-*`) on inner
 * parts are defined in festive.css.
 */

const HEART = 'M12 21S1 14 1 7a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 7-11 14-11 14z';

export const Heart = ({ c = '#e91e63' }: { c?: string }) => (
  <svg viewBox="0 0 24 22">
    <path d={HEART} fill={c} />
  </svg>
);

export const Star = ({ c = '#fff59d' }: { c?: string }) => (
  <svg viewBox="0 0 24 24">
    <path d="M12 1l3 7.5 8 .6-6.1 5.2 1.9 7.9L12 17.8 5.2 22.2l1.9-7.9L1 9.1l8-.6z" fill={c} />
  </svg>
);

export const Flower = ({ c = '#f06292', heart = '#ffd54a' }: { c?: string; heart?: string }) => (
  <svg viewBox="0 0 24 28">
    <path d="M12 13v14" stroke="#558b2f" strokeWidth="1.6" />
    <path d="M12 22c-3-3-6-2-6-2s1 4 6 3" fill="#7cb342" />
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx="12" cy="6" rx="3.2" ry="4.6" fill={c} transform={`rotate(${a} 12 10)`} />
    ))}
    <circle cx="12" cy="10" r="2.6" fill={heart} />
  </svg>
);

export const Tulip = ({ c = '#e53935' }: { c?: string }) => (
  <svg viewBox="0 0 16 30">
    <path d="M8 13v16" stroke="#558b2f" strokeWidth="1.6" />
    <path d="M8 24c-3-4-6-4-6-4s1 5 6 6zM8 22c3-4 6-4 6-4s-1 5-6 6z" fill="#7cb342" />
    <path d="M2 4l3 3 3-5 3 5 3-3v5a6 6 0 0 1-12 0z" fill={c} />
  </svg>
);

export const Balloon = ({ c = '#e53935' }: { c?: string }) => (
  <svg viewBox="0 0 16 30">
    <ellipse cx="8" cy="8" rx="7" ry="8" fill={c} />
    <ellipse cx="5.5" cy="5" rx="1.6" ry="2.4" fill="#fff" opacity=".45" />
    <path d="M7 16h2l-1 2z" fill={c} />
    <path d="M8 18q-3 4 0 6t0 6" stroke="rgba(255,255,255,.7)" strokeWidth=".8" fill="none" />
  </svg>
);

export const Book = ({ c = '#1e88e5' }: { c?: string }) => (
  <svg viewBox="0 0 26 20">
    <path d="M13 4C9 1 4 1 1 2v16c3-1 8-1 12 2z" fill="#fafafa" />
    <path d="M13 4c4-3 9-3 12-2v16c-3-1-8-1-12 2z" fill="#eeeeee" />
    <path d="M3 6h7M3 9h7M3 12h6M16 6h7M16 9h7M16 12h6" stroke="#90a4ae" strokeWidth=".8" />
    <path className="fx-page" d="M13 4c4-3 9-3 12-2v16c-3-1-8-1-12 2z" fill={c} opacity=".9" />
  </svg>
);

export const Flag = ({
  c = '#e53935',
  c2 = '#fff',
  c3 = '#1e88e5',
}: {
  c?: string;
  c2?: string;
  c3?: string;
}) => (
  <svg viewBox="0 0 24 24">
    <path d="M3 2v21" stroke="#cfd8dc" strokeWidth="1.6" />
    <g className="fx-flag-wave">
      <path d="M4 3h17v4H4z" fill={c} />
      <path d="M4 7h17v4H4z" fill={c2} />
      <path d="M4 11h17v4H4z" fill={c3} />
    </g>
  </svg>
);

export const Leaf = ({ c = '#7cb342' }: { c?: string }) => (
  <svg viewBox="0 0 20 20">
    <path d="M2 18C2 8 8 2 18 2c0 10-6 16-16 16z" fill={c} />
    <path d="M3 17L15 5" stroke="rgba(0,0,0,.25)" strokeWidth="1" />
  </svg>
);

export const Snowflake = () => (
  <svg viewBox="0 0 20 20">
    <g stroke="#e3f2fd" strokeWidth="1.4" strokeLinecap="round">
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 10 10)`}>
          <path d="M10 1v18M10 4l-2.5-2M10 4l2.5-2M10 16l-2.5 2M10 16l2.5 2" />
        </g>
      ))}
    </g>
  </svg>
);

export const Sun = () => (
  <svg viewBox="0 0 28 28">
    <g className="fx-spin" stroke="#ffd54a" strokeWidth="1.8" strokeLinecap="round">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M14 1.5v4" transform={`rotate(${i * 30} 14 14)`} />
      ))}
    </g>
    <circle cx="14" cy="14" r="6.5" fill="#ffca28" />
  </svg>
);

export const Moon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M15 2a10 10 0 1 0 7 17A8 8 0 1 1 15 2z" fill="#ffe082" />
  </svg>
);

export const Cloud = () => (
  <svg viewBox="0 0 30 18">
    <path d="M8 17a6 6 0 0 1-1-12 8 8 0 0 1 15 1 5.5 5.5 0 0 1 1 11z" fill="#eceff1" />
  </svg>
);

export const WindTurbine = () => (
  <svg viewBox="0 0 24 34">
    <path d="M11.2 12h1.6l1 21h-3.6z" fill="#eceff1" />
    <g className="fx-spin">
      <path d="M12 11.5L11 1.5h2zM12 11.5l9.2 4.2-1 1.7zM12 11.5l-9.2 4.2 1 1.7z" fill="#fafafa" />
      <circle cx="12" cy="11.5" r="1.4" fill="#b0bec5" />
    </g>
  </svg>
);

export const Windmill = () => (
  <svg viewBox="0 0 26 30">
    <path d="M8 29l2-17h6l2 17z" fill="#6d4c41" />
    <path d="M9 12l4-5 4 5z" fill="#4e342e" />
    <rect x="11.5" y="23" width="3" height="6" fill="#3e2723" />
    <g className="fx-spin">
      <path
        d="M13 10l-1.2-9h2.4zM13 10l9 1.2v-2.4zM13 10l1.2 9h-2.4zM13 10l-9-1.2v2.4z"
        fill="#fafafa"
        opacity=".9"
      />
    </g>
  </svg>
);

export const Wheel = ({ r = 5 }: { r?: number }) => (
  <g className="fx-spin">
    <circle r={r} fill="none" stroke="#263238" strokeWidth="1.6" />
    <path d={`M${-r} 0H${r}M0 ${-r}V${r}`} stroke="#90a4ae" strokeWidth=".7" />
  </g>
);

export const Bike = () => (
  <svg viewBox="0 0 32 20">
    <g transform="translate(7 13)">
      <Wheel />
    </g>
    <g transform="translate(25 13)">
      <Wheel />
    </g>
    <path
      d="M7 13l5-8h9l4 8M12 5l4 8 5-8M11 4h3M20 5l1-2h3"
      stroke="#e53935"
      strokeWidth="1.6"
      fill="none"
      strokeLinejoin="round"
    />
  </svg>
);

export const Car = ({ c = '#43a047' }: { c?: string }) => (
  <svg viewBox="0 0 34 18">
    <path d="M2 13v-3l4-1 4-5h11l5 5 5 1v3z" fill={c} />
    <path d="M11 5h4v4H8zM17 5h3l3 4h-6z" fill="#b3e5fc" />
    <g transform="translate(9 14)">
      <Wheel r={3} />
    </g>
    <g transform="translate(26 14)">
      <Wheel r={3} />
    </g>
    <path d="M15 11l-2 3h2l-1 3 3-4h-2l1-2z" fill="#ffeb3b" />
  </svg>
);

export const Battery = () => (
  <svg viewBox="0 0 14 24">
    <rect x="4.5" y="0" width="5" height="2.5" rx="1" fill="#b0bec5" />
    <rect
      x="1"
      y="2.5"
      width="12"
      height="21"
      rx="2"
      fill="none"
      stroke="#eceff1"
      strokeWidth="1.4"
    />
    <rect className="fx-fill" x="3" y="4.5" width="8" height="17" fill="#66bb6a" />
  </svg>
);

export const Plug = () => (
  <svg viewBox="0 0 20 26">
    <path d="M7 1v6M13 1v6" stroke="#b0bec5" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="3" y="7" width="14" height="9" rx="3" fill="#eceff1" />
    <path className="fx-glow" d="M10 16v9" stroke="#66bb6a" strokeWidth="2.2" />
  </svg>
);

export const Clock = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#fafafa" stroke="#90a4ae" strokeWidth="1.4" />
    {Array.from({ length: 12 }, (_, i) => (
      <path
        key={i}
        d="M12 3.5v1.5"
        stroke="#546e7a"
        strokeWidth="1"
        transform={`rotate(${i * 30} 12 12)`}
      />
    ))}
    <path d="M12 12V7" stroke="#263238" strokeWidth="1.6" strokeLinecap="round" />
    <path
      className="fx-hand"
      d="M12 12h5.5"
      stroke="#e53935"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const Cup = ({ c = '#eceff1' }: { c?: string }) => (
  <svg viewBox="0 0 24 24">
    <g
      className="fx-steam"
      stroke="rgba(255,255,255,.75)"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
    >
      <path d="M8 8q-2-2 0-4t0-4" />
      <path d="M13 8q-2-2 0-4t0-4" />
    </g>
    <path d="M3 10h15v6a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6z" fill={c} />
    <path d="M18 12h1.5a3 3 0 0 1 0 6H17" stroke={c} strokeWidth="1.6" fill="none" />
  </svg>
);

export const Gift = ({
  box = '#e53935',
  ribbon = '#ffd54a',
}: {
  box?: string;
  ribbon?: string;
}) => (
  <svg viewBox="0 0 24 24">
    <path
      d="M12 7C9 3 6 4 7.5 6.5 8.5 8 12 7 12 7zM12 7c3-4 6-3 4.5-.5C15.5 8 12 7 12 7z"
      fill={ribbon}
    />
    <rect x="3" y="7" width="18" height="4" rx="1" fill={box} />
    <rect x="4" y="11" width="16" height="11" fill={box} />
    <rect x="10.5" y="7" width="3" height="15" fill={ribbon} />
  </svg>
);

export const Candle = ({ c = '#e3f2fd' }: { c?: string }) => (
  <svg viewBox="0 0 10 26">
    <path className="fx-flame" d="M5 1c2.2 3 1.9 5.5 0 6.6C3.1 6.5 2.8 4 5 1z" fill="#ffb300" />
    <rect x="2.5" y="8" width="5" height="17" rx="1" fill={c} />
  </svg>
);

/** Advent wreath with `lit` of its four candles burning. */
export const AdventWreath = ({ lit }: { lit: number }) => (
  <svg viewBox="0 0 36 24">
    <ellipse cx="18" cy="19" rx="16" ry="4.5" fill="#2e7d32" />
    <ellipse cx="18" cy="18" rx="11" ry="2.4" fill="#1b5e20" />
    {[0, 1, 2, 3].map((i) => {
      const x = 7 + i * 7.3;
      return (
        <g key={i}>
          <rect
            x={x - 1.6}
            y="8"
            width="3.2"
            height="10"
            rx=".6"
            fill={['#7b1fa2', '#7b1fa2', '#f48fb1', '#7b1fa2'][i]}
          />
          {i < lit && (
            <path
              className="fx-flame"
              style={{ animationDelay: `${-i * 0.3}s` }}
              d={`M${x} 2c1.6 2.2 1.4 4 0 4.8-1.4-.8-1.6-2.6 0-4.8z`}
              fill="#ffb300"
            />
          )}
        </g>
      );
    })}
    <circle cx="5" cy="19" r="1.2" fill="#e53935" />
    <circle cx="31" cy="19" r="1.2" fill="#e53935" />
    <circle cx="18" cy="22" r="1.2" fill="#e53935" />
  </svg>
);

export const Dove = () => (
  <svg viewBox="0 0 30 22">
    <path d="M4 12q6-8 16-4l6-3-2 5q2 6-6 8H8l-4 3 1-5q-3-1-1-4z" fill="#fafafa" />
    <path className="fx-flap" d="M12 10q2-8 10-9-2 7-8 10z" fill="#eceff1" />
    <circle cx="21" cy="9" r=".8" fill="#263238" />
    <path d="M26 7l3 1-3 1" fill="#ffb300" />
    <path d="M27 9q2 2 0 4M28 10l1 2" stroke="#7cb342" strokeWidth=".9" fill="none" />
  </svg>
);

export const Butterfly = ({ c = '#ffb300', c2 = '#7e57c2' }: { c?: string; c2?: string }) => (
  <svg viewBox="0 0 24 20">
    <g className="fx-wings">
      <path d="M12 10C8 0 1 2 2 7s6 4 10 3zM12 10c-4 1-9 2-8 6s6 2 8-6z" fill={c} />
      <path d="M12 10c4-10 11-8 10-3s-6 4-10 3zM12 10c4 1 9 2 8 6s-6 2-8-6z" fill={c2} />
    </g>
    <path d="M12 4v13" stroke="#263238" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const Bee = () => (
  <svg viewBox="0 0 24 18">
    <g className="fx-wings">
      <ellipse cx="10" cy="5" rx="4" ry="3" fill="rgba(255,255,255,.75)" />
      <ellipse cx="15" cy="5" rx="4" ry="3" fill="rgba(255,255,255,.6)" />
    </g>
    <ellipse cx="12" cy="11" rx="8" ry="5" fill="#ffca28" />
    <path d="M9 6.5v9M13 6v10M17 7v8" stroke="#3e2723" strokeWidth="1.8" />
    <circle cx="20" cy="10" r=".8" fill="#3e2723" />
  </svg>
);

export const Bird = ({ c = '#ffca28', body = '#455a64' }: { c?: string; body?: string }) => (
  <svg viewBox="0 0 24 22">
    <path d="M2 20h20" stroke="#6d4c41" strokeWidth="1.8" strokeLinecap="round" />
    <g className="fx-peck">
      <ellipse cx="12" cy="12" rx="6.5" ry="5.5" fill={c} />
      <circle cx="16" cy="7" r="3.8" fill={body} />
      <circle cx="17" cy="6.5" r=".8" fill="#fff" />
      <path d="M19.5 7l3 1-3 1z" fill="#ff8f00" />
      <path d="M6 12l-5 2 5 1z" fill={body} />
    </g>
    <path d="M11 17v3M13 17v3" stroke="#6d4c41" strokeWidth="1" />
  </svg>
);

export const House = ({ c = '#ef6c00', panels = false }: { c?: string; panels?: boolean }) => (
  <svg viewBox="0 0 26 24">
    <path d="M3 11L13 3l10 8v12H3z" fill={c} />
    <path
      d="M1 12L13 2l12 10"
      stroke="#5d4037"
      strokeWidth="2"
      fill="none"
      strokeLinejoin="round"
    />
    <rect x="10.5" y="15" width="5" height="8" fill="#5d4037" />
    <rect x="5.5" y="13" width="3.5" height="3.5" fill="#fff59d" />
    <rect x="17" y="13" width="3.5" height="3.5" fill="#fff59d" />
    {panels && (
      <path d="M14 6l7 5.5-1.5 1.5-7-5.5z" fill="#1a237e" stroke="#5c6bc0" strokeWidth=".4" />
    )}
  </svg>
);

export const Bubble = ({ text, c = '#fafafa' }: { text: string; c?: string }) => (
  <svg viewBox="0 0 34 22">
    <path
      d="M3 2h28a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H12l-6 5v-5H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
      fill={c}
    />
    <text
      x="17"
      y="12.5"
      textAnchor="middle"
      fontSize="8"
      fontFamily="system-ui, sans-serif"
      fontWeight="700"
      fill="#263238"
    >
      {text}
    </text>
  </svg>
);

export const Smiley = ({ wink = false }: { wink?: boolean }) => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10.5" fill="#ffca28" />
    <circle cx="8.5" cy="9.5" r="1.4" fill="#5d4037" />
    {wink ? (
      <path d="M14 9.5h3.5" stroke="#5d4037" strokeWidth="1.4" strokeLinecap="round" />
    ) : (
      <circle cx="15.5" cy="9.5" r="1.4" fill="#5d4037" />
    )}
    <path d="M7 14q5 5 10 0" stroke="#5d4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

export const Apple = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 7c-2-2-9-2-9 6s5 10 9 8c4 2 9 0 9-8s-7-8-9-6z" fill="#e53935" />
    <path d="M12 7c0-3 1-5 3-6" stroke="#5d4037" strokeWidth="1.4" fill="none" />
    <path d="M13 4c3-2 5-1 6 0-2 2-4 2-6 0z" fill="#7cb342" />
    <ellipse cx="8" cy="11" rx="1.4" ry="2.4" fill="#fff" opacity=".35" />
  </svg>
);

export const Chalkboard = ({ text = 'ABC' }: { text?: string }) => (
  <svg viewBox="0 0 34 24">
    <rect
      x="1"
      y="1"
      width="32"
      height="20"
      rx="1"
      fill="#2e7d32"
      stroke="#8d6e63"
      strokeWidth="2"
    />
    <text
      className="fx-write"
      x="17"
      y="14.5"
      textAnchor="middle"
      fontSize="9"
      fontFamily="'Comic Sans MS', cursive"
      fill="none"
      stroke="#fafafa"
      strokeWidth=".6"
    >
      {text}
    </text>
    <rect x="22" y="20" width="6" height="2" rx=".6" fill="#fafafa" />
  </svg>
);

export const Cat = () => (
  <svg viewBox="0 0 26 24">
    <path
      className="fx-tail"
      d="M20 20q6-2 4-9"
      stroke="#ff8f00"
      strokeWidth="2.4"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse cx="13" cy="19" rx="8" ry="5" fill="#ffa726" />
    <circle cx="13" cy="10" r="6.5" fill="#ffa726" />
    <path d="M7.5 7L7 1l5 4zM18.5 7L19 1l-5 4z" fill="#ffa726" />
    <circle cx="10.5" cy="10" r="1" fill="#263238" />
    <circle cx="15.5" cy="10" r="1" fill="#263238" />
    <path d="M12 12.5h2l-1 1z" fill="#f48fb1" />
    <path d="M4 12h5M4 14l5-1M22 12h-5M22 14l-5-1" stroke="#fff" strokeWidth=".5" />
  </svg>
);

export const Dog = () => (
  <svg viewBox="0 0 26 24">
    <path
      className="fx-tail"
      d="M21 17q5-3 3-8"
      stroke="#8d6e63"
      strokeWidth="2.6"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse cx="13" cy="19" rx="8.5" ry="5" fill="#a1887f" />
    <circle cx="11" cy="10" r="6.5" fill="#a1887f" />
    <ellipse cx="5.5" cy="10" rx="2.4" ry="5" fill="#6d4c41" />
    <ellipse cx="16.5" cy="10" rx="2.4" ry="5" fill="#6d4c41" />
    <circle cx="9" cy="9" r="1" fill="#263238" />
    <circle cx="13" cy="9" r="1" fill="#263238" />
    <ellipse cx="11" cy="12.5" rx="2" ry="1.4" fill="#263238" />
    <path
      className="fx-tongue"
      d="M11 14v2.5"
      stroke="#f48fb1"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const Coach = () => (
  <svg viewBox="0 0 40 24">
    <path d="M8 6h20l3 10H6z" fill="#ffc107" />
    <path d="M11 8h6v6h-7zM19 8h6l2 6h-8z" fill="#b3e5fc" />
    <path d="M15 3l3-2 3 2z" fill="#ffc107" />
    <path d="M31 13h8M2 13h4" stroke="#ffc107" strokeWidth="1.2" />
    <g transform="translate(11 18)">
      <Wheel r={4.5} />
    </g>
    <g transform="translate(26 18)">
      <Wheel r={4.5} />
    </g>
  </svg>
);

export const Briefcase = () => (
  <svg viewBox="0 0 26 20">
    <path d="M10 4V2h6v2" stroke="#5d4037" strokeWidth="1.6" fill="none" />
    <rect x="1" y="5" width="24" height="14" rx="1.5" fill="#4e342e" />
    <path className="fx-lid" d="M1 5h24v5H1z" fill="#6d4c41" />
    <rect x="11" y="9" width="4" height="2.4" fill="#ffc107" />
  </svg>
);

export const Steamboat = () => (
  <svg viewBox="0 0 44 24">
    <g className="fx-steam" fill="rgba(255,255,255,.75)">
      <circle cx="18" cy="4" r="2.4" />
      <circle cx="22" cy="2.4" r="1.8" />
    </g>
    <rect x="16" y="6" width="4" height="7" fill="#e53935" />
    <rect x="9" y="10" width="20" height="5" fill="#fafafa" />
    <path d="M2 15h40l-5 7H7z" fill="#e53935" />
    <path d="M10 18h26" stroke="#fafafa" strokeWidth="1" />
    <path d="M33 10V3l6 3-6 2" fill="#1e88e5" />
  </svg>
);

export const Shoe = () => (
  <svg viewBox="0 0 26 20">
    <path d="M3 4h6v6l9 3c4 1 6 3 6 5H3z" fill="#ef6c00" />
    <path d="M3 17h21" stroke="#5d4037" strokeWidth="1.8" />
    <path d="M10 10l2-2M12 11l2-2" stroke="#fafafa" strokeWidth=".9" />
    <circle className="fx-bob" cx="6" cy="6" r="1.6" fill="#8d6e63" />
  </svg>
);

export const Pepernoot = () => (
  <svg viewBox="0 0 10 10">
    <circle cx="5" cy="5" r="4.4" fill="#a1652b" />
    <circle cx="3.6" cy="3.8" r=".7" fill="#6d3c14" />
    <circle cx="6.2" cy="6" r=".6" fill="#6d3c14" />
  </svg>
);

export const Lantern = ({ c = '#ff7043' }: { c?: string }) => (
  <svg viewBox="0 0 24 30">
    <path d="M12 0v6" stroke="rgba(255,255,255,.7)" strokeWidth="1" />
    <rect x="8" y="6" width="8" height="2" rx="1" fill="#333" />
    <ellipse cx="12" cy="17" rx="9" ry="9" fill={c} />
    <ellipse className="fx-glow" cx="12" cy="17" rx="5" ry="6" fill="#fff59d" opacity=".75" />
    <rect x="9" y="25.5" width="6" height="1.6" rx=".8" fill="#333" />
  </svg>
);

export const Mooncake = () => (
  <svg viewBox="0 0 24 18">
    <ellipse cx="12" cy="13" rx="10" ry="4.5" fill="#a1652b" />
    <rect x="2" y="7" width="20" height="6" fill="#c6893f" />
    <ellipse cx="12" cy="7" rx="10" ry="4.5" fill="#d9a35b" />
    <path d="M12 4.5l1 2.5h2.5l-2 1.5.8 2.5-2.3-1.5-2.3 1.5.8-2.5-2-1.5H11z" fill="#a1652b" />
  </svg>
);

export const Lotus = () => (
  <svg viewBox="0 0 28 20">
    <g className="fx-open">
      <path d="M14 18C8 14 6 8 8 3c4 2 6 8 6 15z" fill="#f48fb1" />
      <path d="M14 18c6-4 8-10 6-15-4 2-6 8-6 15z" fill="#f48fb1" />
      <path
        d="M14 18C9 16 3 15 1 10c5-1 10 2 13 8zM14 18c5-2 11-3 13-8-5-1-10 2-13 8z"
        fill="#f8bbd0"
      />
    </g>
    <path d="M14 18c-2-5-2-10 0-16 2 6 2 11 0 16z" fill="#fce4ec" />
  </svg>
);

export const Shofar = () => (
  <svg viewBox="0 0 30 18">
    <path
      d="M2 14c6 2 14 2 20-4 3-3 5-7 6-9-1 4-2 9-6 12-6 5-16 4-20 3z"
      fill="#d7b98e"
      stroke="#8d6e63"
      strokeWidth=".6"
    />
  </svg>
);

export const HoneyPot = () => (
  <svg viewBox="0 0 22 22">
    <path d="M4 9h14l-1 11H5z" fill="#ffb300" />
    <rect x="3" y="7" width="16" height="3" rx="1" fill="#ff8f00" />
    <path d="M7 10v4q1 2 2 0v-4" fill="#ffca28" />
    <text x="11" y="18.5" textAnchor="middle" fontSize="4" fontWeight="700" fill="#5d4037">
      HONEY
    </text>
  </svg>
);

export const Matzah = () => (
  <svg viewBox="0 0 24 20">
    <rect x="2" y="4" width="18" height="14" rx="1.5" fill="#f3d9a4" />
    <path
      d="M5 6v10M9 6v10M13 6v10M17 6v10"
      stroke="#c49a52"
      strokeWidth=".7"
      strokeDasharray="1 1.4"
    />
    <path d="M20 2h3l-.6 6a1 1 0 0 1-1.8 0z" fill="#ad1457" />
    <path d="M21.5 8v6M20 14h3" stroke="#90a4ae" strokeWidth=".9" />
  </svg>
);

export const Football = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10.5" fill="#fafafa" stroke="#263238" strokeWidth=".8" />
    <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="#263238" />
    <path
      d="M12 7V2.5M16 10l4.5-1.5M14.5 14.5l2.8 4M9.5 14.5l-2.8 4M8 10L3.5 8.5"
      stroke="#263238"
      strokeWidth=".8"
    />
  </svg>
);

export const ShootingStar = () => (
  <svg viewBox="0 0 40 12">
    <path d="M2 2l30 6" stroke="url(#festive-trail)" strokeWidth="1.6" strokeLinecap="round" />
    <defs>
      <linearGradient id="festive-trail" x1="0" x2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#fff" />
      </linearGradient>
    </defs>
    <circle cx="33" cy="8.2" r="2" fill="#fffde7" />
  </svg>
);

export const Schoolbag = () => (
  <svg viewBox="0 0 24 24">
    <path d="M8 5a4 4 0 0 1 8 0" stroke="#1565c0" strokeWidth="1.6" fill="none" />
    <rect x="3" y="5" width="18" height="18" rx="3" fill="#1e88e5" />
    <path d="M3 11h18" stroke="#1565c0" strokeWidth="1.2" />
    <rect x="9" y="10" width="6" height="3" rx="1" fill="#ffca28" />
  </svg>
);

export const Pencil = () => (
  <svg viewBox="0 0 24 24">
    <g className="fx-scribble">
      <path d="M4 20l2-6L17 3l4 4L10 18z" fill="#ffca28" />
      <path d="M4 20l2-6 4 4z" fill="#ffe0b2" />
      <path d="M4 20l.8-2.4 1.6 1.6z" fill="#263238" />
      <path d="M17 3l4 4 1-1a1.4 1.4 0 0 0 0-2l-2-2a1.4 1.4 0 0 0-2 0z" fill="#f48fb1" />
    </g>
  </svg>
);

export const Plate = () => (
  <svg viewBox="0 0 28 20">
    <ellipse cx="13" cy="12" rx="11" ry="6" fill="#fafafa" />
    <ellipse cx="13" cy="12" rx="7" ry="3.6" fill="#eceff1" />
    <circle cx="10" cy="11" r="2" fill="#43a047" />
    <circle cx="14" cy="12.5" r="1.8" fill="#ef6c00" />
    <ellipse cx="16" cy="10.5" rx="1.6" ry="1" fill="#e53935" />
    <g className="fx-poke">
      <path d="M25 1v10M23.5 1v4M26.5 1v4M23.5 5h3" stroke="#b0bec5" strokeWidth=".9" />
    </g>
  </svg>
);

export const Owl = () => (
  <svg viewBox="0 0 22 26">
    <path d="M3 8l3 2M19 8l-3 2" stroke="#8d6e63" strokeWidth="1.6" />
    <ellipse cx="11" cy="16" rx="8" ry="9" fill="#8d6e63" />
    <ellipse cx="11" cy="19" rx="5" ry="5.5" fill="#bcaaa4" />
    <circle cx="7.5" cy="12" r="3.2" fill="#fafafa" />
    <circle cx="14.5" cy="12" r="3.2" fill="#fafafa" />
    <g className="fx-blink">
      <circle cx="7.5" cy="12" r="1.6" fill="#263238" />
      <circle cx="14.5" cy="12" r="1.6" fill="#263238" />
    </g>
    <path d="M10 14.5h2l-1 2z" fill="#ffb300" />
  </svg>
);

export const Sapling = () => (
  <svg viewBox="0 0 24 26">
    <path d="M2 24h20" stroke="#6d4c41" strokeWidth="2.4" strokeLinecap="round" />
    <g className="fx-grow">
      <path d="M12 24V12" stroke="#6d4c41" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="6" fill="#66bb6a" />
      <circle cx="8" cy="12" r="3.5" fill="#43a047" />
      <circle cx="16" cy="11.5" r="3.8" fill="#43a047" />
    </g>
  </svg>
);

export const Trowel = () => (
  <svg viewBox="0 0 22 24">
    <path d="M10 13l-6 9 9-6z" fill="#90a4ae" />
    <path d="M11 13l8-9" stroke="#6d4c41" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const JesterCap = () => (
  <svg viewBox="0 0 30 24">
    <path d="M4 22h22l-2-6-9 2-9-2z" fill="#fafafa" />
    <path d="M6 16C2 12 1 6 2 3c4 2 8 7 13 15zM24 16c4-4 5-10 4-13-4 2-8 7-13 15z" fill="#e53935" />
    <path d="M15 18C13 10 12 5 15 1c3 4 2 9 0 17z" fill="#43a047" />
    <g className="fx-jingle" fill="#ffca28">
      <circle cx="2" cy="3" r="1.8" />
      <circle cx="28" cy="3" r="1.8" />
      <circle cx="15" cy="1.5" r="1.8" />
    </g>
  </svg>
);

export const Moustache = () => (
  <svg viewBox="0 0 30 12">
    <path
      d="M15 4c-3-3-8-3-11 0-2 2-3 5-3 5s3-2 6-2 6 0 8-3c2 3 5 3 8 3s6 2 6 2-1-3-3-5c-3-3-8-3-11 0z"
      fill="#5d4037"
    />
  </svg>
);

export const WaterGlass = () => (
  <svg viewBox="0 0 16 24">
    <path d="M10 0l-2 12" stroke="#4fc3f7" strokeWidth="1.2" />
    <path
      d="M2 6h12l-1.5 17h-9z"
      fill="rgba(179,229,252,.35)"
      stroke="rgba(255,255,255,.8)"
      strokeWidth=".8"
    />
    <path d="M2.7 12h10.6l-1 11h-8.6z" fill="#81d4fa" opacity=".7" />
    {[5, 8, 11].map((x, i) => (
      <circle
        key={x}
        className="fx-bubble"
        style={{ animationDelay: `${-i * 0.5}s` }}
        cx={x}
        cy="21"
        r=".8"
        fill="#e1f5fe"
      />
    ))}
  </svg>
);

export const Skis = () => (
  <svg viewBox="0 0 24 26">
    <path
      d="M7 25V3q0-2 2-1M15 25V3q0-2 2-1"
      stroke="#e53935"
      strokeWidth="2.4"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M4 25L20 1M20 25L4 1" stroke="#b0bec5" strokeWidth="1" opacity=".6" />
  </svg>
);

export const Snowman = () => (
  <svg viewBox="0 0 22 28">
    <circle cx="11" cy="20" r="7" fill="#fafafa" />
    <circle cx="11" cy="9.5" r="5" fill="#fafafa" />
    <rect x="7" y="1" width="8" height="4" fill="#263238" />
    <rect x="5" y="4.5" width="12" height="1.4" fill="#263238" />
    <circle cx="9.3" cy="8.5" r=".7" fill="#263238" />
    <circle cx="12.7" cy="8.5" r=".7" fill="#263238" />
    <path d="M11 10l3 1-3 .6z" fill="#ff8f00" />
    <path
      className="fx-wave-arm"
      d="M17 17l4-4"
      stroke="#6d4c41"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const Kite = () => (
  <svg viewBox="0 0 24 30">
    <path d="M12 1l9 10-9 10-9-10z" fill="#e53935" />
    <path d="M12 1v20M3 11h18" stroke="#fff" strokeWidth=".8" />
    <path d="M12 1l9 10H12zM12 21l-9-10h9z" fill="#ffca28" />
    <path d="M12 21q-3 3 0 5t0 4" stroke="#fafafa" strokeWidth=".8" fill="none" />
    <path d="M11 24l-2 1 2 .5zM12 28l2 1-2 .5z" fill="#1e88e5" />
  </svg>
);

export const Caravan = () => (
  <svg viewBox="0 0 44 22">
    <path d="M30 8h7l4 5v4H30z" fill="#1e88e5" />
    <path d="M32 9h4l3 4h-7z" fill="#b3e5fc" />
    <path d="M2 4q0-3 3-3h20q3 0 3 3v13H2z" fill="#fafafa" />
    <path d="M2 11h26" stroke="#ff8f00" strokeWidth="1.6" />
    <rect x="6" y="4" width="7" height="5" rx="1" fill="#b3e5fc" />
    <path d="M28 15h2" stroke="#90a4ae" strokeWidth="1.2" />
    <g transform="translate(15 18)">
      <Wheel r={3} />
    </g>
    <g transform="translate(35 18)">
      <Wheel r={3} />
    </g>
  </svg>
);

export const BeachBall = () => (
  <svg viewBox="0 0 24 24">
    <g className="fx-spin">
      <circle cx="12" cy="12" r="10.5" fill="#fafafa" />
      <path d="M12 1.5a10.5 10.5 0 0 1 9.1 5.3L12 12z" fill="#e53935" />
      <path d="M22.5 12a10.5 10.5 0 0 1-5.3 9.1L12 12z" fill="#1e88e5" />
      <path d="M12 22.5a10.5 10.5 0 0 1-9.1-5.3L12 12z" fill="#ffca28" />
      <path d="M1.5 12a10.5 10.5 0 0 1 5.3-9.1L12 12z" fill="#43a047" />
    </g>
  </svg>
);

export const Umbrella = () => (
  <svg viewBox="0 0 26 28">
    <path
      d="M13 3A11 11 0 0 0 2 14q2.75-2 5.5 0 2.75-2 5.5 0 2.75-2 5.5 0 2.75-2 5.5 0A11 11 0 0 0 13 3z"
      fill="#7e57c2"
    />
    <path
      d="M13 1v2M13 14v10a2 2 0 0 1-4 0"
      stroke="#5d4037"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />
    {[4, 22].map((x, i) => (
      <path
        key={x}
        className="fx-rain"
        style={{ animationDelay: `${-i * 0.4}s` }}
        d={`M${x} 18v3`}
        stroke="#81d4fa"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

export const Boots = () => (
  <svg viewBox="0 0 26 22">
    <path d="M3 2h6v13h6v6H3zM14 4h6v11h5v6H14z" fill="#fdd835" />
    <path d="M3 18h12M14 18h11" stroke="#f9a825" strokeWidth="1.2" />
  </svg>
);

export const IceCream = () => (
  <svg viewBox="0 0 18 28">
    <path d="M3 12h12l-6 15z" fill="#d7a35b" />
    <path d="M4 13l9 6M6 18l6-5M8 23l3-3" stroke="#a1652b" strokeWidth=".6" />
    <circle cx="9" cy="9" r="5.5" fill="#f8bbd0" />
    <circle cx="6" cy="6" r="4" fill="#fff59d" />
    <circle cx="12" cy="6" r="4" fill="#a5d6a7" />
    <circle cx="9" cy="1.8" r="1.5" fill="#e53935" />
  </svg>
);

export const Sailboat = () => (
  <svg viewBox="0 0 30 26">
    <path d="M15 2v17" stroke="#8d6e63" strokeWidth="1.2" />
    <path d="M16 3l11 15H16z" fill="#fafafa" />
    <path d="M14 6L5 18h9z" fill="#ffca28" />
    <path d="M3 20h25l-4 5H7z" fill="#e53935" />
  </svg>
);

export const Molecule = () => (
  <svg viewBox="0 0 30 20">
    <g className="fx-spin">
      <path d="M8 10h14" stroke="#b0bec5" strokeWidth="2.2" />
      <circle cx="7" cy="10" r="6" fill="#4fc3f7" />
      <circle cx="23" cy="10" r="6" fill="#4fc3f7" />
      <text x="7" y="12.8" textAnchor="middle" fontSize="7" fontWeight="800" fill="#01579b">
        H
      </text>
      <text x="23" y="12.8" textAnchor="middle" fontSize="7" fontWeight="800" fill="#01579b">
        H
      </text>
    </g>
  </svg>
);

export const EnergyLabel = () => (
  <svg viewBox="0 0 26 24">
    {['#00a651', '#4cb847', '#bfd730', '#fff200', '#fdb913', '#f37021', '#ed1c24'].map((c, i) => (
      <path
        key={c}
        className={i === 0 ? 'fx-glow' : undefined}
        d={`M1 ${1 + i * 3.2}h${10 + i * 2}l2 1.4-2 1.4H1z`}
        fill={c}
      />
    ))}
  </svg>
);

export const Heartbeat = () => (
  <svg viewBox="0 0 48 16">
    <path
      className="fx-trace"
      d="M0 9h12l3-6 4 12 4-10 3 4h22"
      stroke="#ff5252"
      strokeWidth="1.6"
      fill="none"
      strokeLinejoin="round"
    />
  </svg>
);

export const Palette = () => (
  <svg viewBox="0 0 28 22">
    <path
      d="M14 2C6 2 1 7 1 12c0 6 6 9 10 7 2-1 0-4 3-4h6c4 0 7-2 7-5 0-5-6-8-13-8z"
      fill="#d7b98e"
    />
    <circle cx="7" cy="9" r="2" fill="#e53935" />
    <circle cx="12" cy="6" r="2" fill="#fdd835" />
    <circle cx="18" cy="6.5" r="2" fill="#1e88e5" />
    <circle cx="22" cy="10" r="2" fill="#43a047" />
    <ellipse cx="10" cy="14" rx="2.4" ry="1.8" fill="#263238" opacity=".25" />
  </svg>
);

export const Brush = () => (
  <svg viewBox="0 0 24 24">
    <g className="fx-scribble">
      <path d="M21 2l-9 11 2 2L23 4z" fill="#8d6e63" />
      <path d="M12 13c-3 0-5 2-5 5s-3 3-5 3c5 2 12 1 12-4z" fill="#7e57c2" />
    </g>
  </svg>
);

export const Plaster = () => (
  <svg viewBox="0 0 28 14">
    <rect x="1" y="2" width="26" height="10" rx="5" fill="#ffcc80" transform="rotate(-12 14 7)" />
    <rect x="9" y="3" width="10" height="8" fill="#ffe0b2" transform="rotate(-12 14 7)" />
    {[11, 14, 17].map((x) => (
      <circle key={x} cx={x} cy="7" r=".6" fill="#e0a96d" transform="rotate(-12 14 7)" />
    ))}
  </svg>
);

export const Frame = () => (
  <svg viewBox="0 0 30 24">
    <defs>
      <clipPath id="festive-frame">
        <rect x="4" y="4" width="22" height="16" />
      </clipPath>
    </defs>
    <rect x="1" y="1" width="28" height="22" fill="#c9a227" />
    <rect x="4" y="4" width="22" height="16" fill="#3e2723" />
    <circle cx="11" cy="11" r="2.4" fill="#ffcc80" />
    <circle cx="18" cy="10" r="2.2" fill="#ffcc80" />
    <path d="M8 20q3-6 6 0M15 20q3-7 7 0" fill="#5d4037" />
    <g clipPath="url(#festive-frame)">
      <rect
        className="fx-shine"
        x="-8"
        y="4"
        width="4"
        height="16"
        fill="rgba(255,255,255,.35)"
        transform="skewX(-20)"
      />
    </g>
  </svg>
);

export const Ladybug = () => (
  <svg viewBox="0 0 20 18">
    <circle cx="10" cy="5" r="3.5" fill="#263238" />
    <ellipse cx="10" cy="11" rx="8" ry="6.5" fill="#e53935" />
    <path d="M10 5v12.5" stroke="#263238" strokeWidth="1" />
    {[
      [6, 9],
      [14, 9],
      [5.5, 13],
      [14.5, 13],
    ].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" fill="#263238" />
    ))}
  </svg>
);

export const Towel = () => (
  <svg viewBox="0 0 26 26">
    <path d="M3 3h20v20H3z" fill="#1e88e5" />
    <path d="M3 7h20M3 19h20" stroke="#fafafa" strokeWidth="1.4" />
    <text x="13" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fafafa">
      42
    </text>
  </svg>
);

export const Basket = () => (
  <svg viewBox="0 0 28 22">
    <path d="M6 9a8 8 0 0 1 16 0" stroke="#8d6e63" strokeWidth="1.6" fill="none" />
    <path d="M2 9h24l-3 12H5z" fill="#c49a52" />
    <path d="M3 12h22M4 15h20M5 18h18" stroke="#8d6e63" strokeWidth=".7" />
    <path d="M2 9l4-2h16l4 2" fill="url(#festive-gingham)" />
    <defs>
      <pattern id="festive-gingham" width="3" height="3" patternUnits="userSpaceOnUse">
        <rect width="3" height="3" fill="#fafafa" />
        <rect width="1.5" height="1.5" fill="#e53935" />
        <rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#e53935" />
      </pattern>
    </defs>
  </svg>
);

export const Heron = () => (
  <svg viewBox="0 0 22 30">
    <g stroke="#7cb342" strokeWidth="1" fill="none">
      <path d="M2 30q1-10 0-18M4 30q2-8 4-14M19 30q-1-9 1-15" />
    </g>
    <path d="M11 29v-9M13 29v-9" stroke="#78909c" strokeWidth=".9" />
    <ellipse cx="12" cy="17" rx="5" ry="3.5" fill="#cfd8dc" />
    <path
      className="fx-bob"
      d="M14 15q1-6-2-9 0-3 3-3l1 2h5l-5 1q-1 3 1 8"
      fill="#cfd8dc"
      stroke="#cfd8dc"
      strokeWidth="1.4"
    />
  </svg>
);

export const Pancake = () => (
  <svg viewBox="0 0 30 20">
    <ellipse className="fx-flip" cx="14" cy="9" rx="8" ry="2.6" fill="#e0a54a" />
    <path d="M3 14h22a2 2 0 0 1-2 3H5a2 2 0 0 1-2-3z" fill="#455a64" />
    <path d="M25 15h4" stroke="#263238" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Pi = () => (
  <svg viewBox="0 0 24 22">
    <path
      d="M3 5q2-3 6-3h12M8 3v11q0 4-3 6M15 3v13q0 3 3 3 2 0 3-2"
      stroke="#ffca28"
      strokeWidth="2.6"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const Pie = () => (
  <svg viewBox="0 0 24 20">
    <g className="fx-spin">
      <ellipse cx="12" cy="12" rx="10" ry="6" fill="#c6893f" />
      <ellipse cx="12" cy="10.5" rx="9" ry="4.8" fill="#e53935" />
      <path d="M4 10.5h16M12 6v9M6 7l12 7M18 7L6 14" stroke="#e0a54a" strokeWidth="1.2" />
    </g>
  </svg>
);

export const HighFive = () => (
  <svg viewBox="0 0 36 26">
    <g className="fx-highfive-left">
      <circle cx="7" cy="6" r="3.5" fill="#ffcc80" />
      <path
        d="M7 10v9M7 13l7-7M7 19l-3 6M7 19l3 6"
        stroke="#1e88e5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
    <g className="fx-highfive-right">
      <circle cx="29" cy="6" r="3.5" fill="#8d5524" />
      <path
        d="M29 10v9M29 13l-7-7M29 19l-3 6M29 19l3 6"
        stroke="#e53935"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
    <circle className="fx-glow" cx="18" cy="5" r="2" fill="#fff59d" />
  </svg>
);

export const Stars12 = () => (
  <svg viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="13.5" fill="#003399" />
    <g className="fx-spin">
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M14 3.2l.9 2 2.1.2-1.6 1.4.5 2.1-1.9-1.1-1.9 1.1.5-2.1-1.6-1.4 2.1-.2z"
          fill="#ffcc00"
          transform={`rotate(${i * 30} 14 14)`}
        />
      ))}
    </g>
  </svg>
);

export const Medal = () => (
  <svg viewBox="0 0 20 28">
    <path d="M5 1l5 10 5-10" stroke="#e53935" strokeWidth="3" fill="none" />
    <circle cx="10" cy="18" r="7" fill="#ffc107" />
    <circle cx="10" cy="18" r="4.6" fill="#ffca28" stroke="#ff8f00" strokeWidth=".8" />
    <text x="10" y="20.4" textAnchor="middle" fontSize="6" fontWeight="800" fill="#e65100">
      4
    </text>
    <defs>
      <clipPath id="festive-medal">
        <circle cx="10" cy="18" r="7" />
      </clipPath>
    </defs>
    <g clipPath="url(#festive-medal)">
      <rect
        className="fx-shine"
        x="-8"
        y="10"
        width="3"
        height="16"
        fill="rgba(255,255,255,.6)"
        transform="skewX(-20)"
      />
    </g>
  </svg>
);

export const Brackets = () => (
  <svg viewBox="0 0 32 20">
    <text
      x="2"
      y="15"
      fontSize="15"
      fontFamily="ui-monospace, monospace"
      fontWeight="700"
      fill="#80cbc4"
    >
      {'{'}
    </text>
    <text
      x="22"
      y="15"
      fontSize="15"
      fontFamily="ui-monospace, monospace"
      fontWeight="700"
      fill="#80cbc4"
    >
      {'}'}
    </text>
    <rect className="fx-cursor" x="14" y="4" width="3" height="12" fill="#fafafa" />
  </svg>
);

export const Glasses = () => (
  <svg viewBox="0 0 30 12">
    <circle cx="8" cy="6" r="5" fill="none" stroke="#5d4037" strokeWidth="1.4" />
    <circle cx="22" cy="6" r="5" fill="none" stroke="#5d4037" strokeWidth="1.4" />
    <path d="M13 6q2-2 4 0" stroke="#5d4037" strokeWidth="1.4" fill="none" />
  </svg>
);

export const Knitting = () => (
  <svg viewBox="0 0 26 24">
    <circle cx="10" cy="15" r="8" fill="#ec407a" />
    <path
      d="M4 12q6 3 12 0M3 16q7 3 14 0M5 20q5 2 10 0"
      stroke="#ad1457"
      strokeWidth=".8"
      fill="none"
    />
    <path
      className="fx-knit"
      d="M14 3l10 16M20 2l-4 20"
      stroke="#b0bec5"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const LightBeams = () => (
  <svg viewBox="0 0 40 24">
    {['#ff4081', '#40c4ff', '#ffd740'].map((c, i) => (
      <path
        key={c}
        className="fx-beam"
        style={{ animationDelay: `${-i * 1.1}s` }}
        d="M20 24L14 0h12z"
        fill={c}
        opacity=".45"
      />
    ))}
  </svg>
);

export const Litter = () => (
  <svg viewBox="0 0 26 26">
    <path d="M14 2l4 18" stroke="#90a4ae" strokeWidth="1.4" />
    <path d="M17 19l1.5 6" stroke="#cfd8dc" strokeWidth="1" />
    <path d="M2 10h10l-1 14H3z" fill="#263238" />
    <path className="fx-fill" d="M3 16h8l-.6 8H3.6z" fill="#546e7a" />
    <path d="M2 10q5-3 10 0" stroke="#37474f" strokeWidth="1.4" fill="none" />
  </svg>
);

export const Tap = () => (
  <svg viewBox="0 0 24 28">
    <path d="M2 6h12a4 4 0 0 1 4 4v3h-4v-3H2z" fill="#b0bec5" />
    <rect x="6" y="2" width="4" height="4" fill="#90a4ae" />
    <circle className="fx-drip" cx="16" cy="15" r="1.6" fill="#4fc3f7" />
    <ellipse
      className="fx-ripple"
      cx="16"
      cy="26"
      rx="6"
      ry="1.4"
      fill="none"
      stroke="#81d4fa"
      strokeWidth=".8"
    />
  </svg>
);

export const Scales = () => (
  <svg viewBox="0 0 26 22">
    <path d="M13 2v18M7 21h12" stroke="#ffc107" strokeWidth="1.6" />
    <path className="fx-tilt" d="M3 6h20" stroke="#ffc107" strokeWidth="1.4" />
  </svg>
);
