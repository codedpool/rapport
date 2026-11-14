// Wordmark with a small voice-wave mark: three bars, the middle one tallest.
export default function Logo({ tone = "dark" }) {
  const color = tone === "light" ? "#fff" : "var(--accent)";
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Rapport">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <rect x="0" y="0" width="26" height="26" rx="8" fill="var(--haldi)" />
        <rect x="6.5" y="9.5" width="3" height="7" rx="1.5" fill="var(--accent-ink)" />
        <rect x="11.5" y="6" width="3" height="14" rx="1.5" fill="var(--accent-ink)" />
        <rect x="16.5" y="10.5" width="3" height="5" rx="1.5" fill="var(--accent-ink)" />
      </svg>
      <span className="display text-[1.35rem] leading-none" style={{ color }}>
        rapport
      </span>
    </span>
  );
}
