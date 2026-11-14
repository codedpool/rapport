// Mark: an orange speech-leaf, a nod to conversation and growth.
export default function Logo({ tone = "dark", size = "md" }) {
  const text = tone === "light" ? "#fff" : "var(--accent)";
  const s = size === "lg" ? 30 : 24;
  return (
    <span className="inline-flex items-center gap-2" aria-label="Rapport">
      <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="rl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f8a55a" />
            <stop offset="1" stopColor="#e8601f" />
          </linearGradient>
        </defs>
        <path d="M4 18C4 9 11 4 20 4h8v8c0 9-6 15-15 15H8l-4 3v-12Z" fill="url(#rl)" />
        <path d="M10 21c3-5 7-8 13-11" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
      </svg>
      <span className={`display ${size === "lg" ? "text-[1.6rem]" : "text-[1.35rem]"} leading-none`} style={{ color: text, fontWeight: 600 }}>
        Rapport
      </span>
    </span>
  );
}
