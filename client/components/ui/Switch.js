"use client";

import { motion } from "motion/react";

export default function Switch({ checked, onChange, title, body }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`flex items-start gap-4 text-left rounded-2xl border p-4 transition-colors ${checked ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-ink-2"}`}>
      <span className={`mt-0.5 relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-paper-2"}`}>
        <motion.span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ left: checked ? 22 : 2 }} transition={{ type: "spring", stiffness: 600, damping: 35 }} />
      </span>
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        {body && <span className="block text-[0.92rem] text-muted mt-0.5">{body}</span>}
      </span>
    </button>
  );
}
