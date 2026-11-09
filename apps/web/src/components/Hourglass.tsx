/**
 * Animated hourglass with a short text (#52): the sand runs down, then the glass turns over.
 * Still when the user prefers reduced motion (CSS).
 */
export default function Hourglass({ label }: { label: string }) {
  return (
    <span className="hourglass" role="status">
      <svg className="hourglass__icon" viewBox="0 0 24 32" aria-hidden="true">
        <g className="hourglass__glass">
          <path className="hourglass__frame" d="M3 2h18M3 30h18" />
          <path
            className="hourglass__outline"
            d="M5 2c0 7 6 9 6 14S5 23 5 30M19 2c0 7-6 9-6 14s6 7 6 14"
          />
          <path
            className="hourglass__sand hourglass__sand--top"
            d="M7 7h10c-1 3-4 5-5 7-1-2-4-4-5-7z"
          />
          <path
            className="hourglass__sand hourglass__sand--bottom"
            d="M6.5 28c1-4 4-6 5.5-7.5 1.5 1.5 4.5 3.5 5.5 7.5z"
          />
          <path className="hourglass__stream" d="M12 15v10" />
        </g>
      </svg>
      <span className="hourglass__label">{label}</span>
    </span>
  );
}
