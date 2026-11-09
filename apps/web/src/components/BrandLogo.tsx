/** MNEXT logo; the white version is swapped in by CSS when the dark theme is active. */
export default function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={`brand-logo ${className ?? ''}`}>
      <img className="brand-logo__light" src="/brand/mnext-logo.svg" alt="MNEXT" />
      <img className="brand-logo__dark" src="/brand/mnext-logo-white.svg" alt="MNEXT" />
    </span>
  );
}
