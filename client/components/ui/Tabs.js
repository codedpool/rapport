"use client";

import { useId } from "react";
import { motion } from "motion/react";

// Underline tabs; the indicator slides to the selected tab.
export default function Tabs({ value, onChange, tabs, className = "" }) {
  const id = useId();
  return (
    <div role="tablist" className={`flex gap-1 border-b border-line overflow-x-auto ${className}`}>
      {tabs.map(([key, label]) => {
        const on = value === key;
        return (
          <button key={key} role="tab" aria-selected={on} onClick={() => onChange(key)}
            className={`relative px-4 py-3 text-[1rem] font-medium whitespace-nowrap transition-colors ${on ? "text-ink" : "text-muted hover:text-ink"}`}>
            {label}
            {on && (
              <motion.span layoutId={`tab-${id}`} className="absolute left-2 right-2 -bottom-px h-[3px] rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
