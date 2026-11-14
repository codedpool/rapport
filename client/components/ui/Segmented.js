"use client";

import { useId } from "react";
import { motion } from "motion/react";

// Segmented control with a sliding selection.
export default function Segmented({ value, options, onChange, label, size = "md" }) {
  const id = useId();
  const pad = size === "sm" ? "px-3 py-1.5 text-[0.9rem]" : "px-4 py-2 text-[0.97rem]";
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-[0.95rem] border border-line bg-white p-1">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={String(o.id)} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id)}
            className={`relative rounded-[0.7rem] font-medium transition-colors ${pad} ${on ? "text-white" : "text-ink-2 hover:text-ink"}`}>
            {on && (
              <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[0.7rem] bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
