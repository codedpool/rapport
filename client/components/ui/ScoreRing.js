"use client";

import useReducedMotionSafe from "@/lib/useReducedMotionSafe";
import { motion } from "motion/react";

// Overall score out of 10, drawn as a ring that fills once on load.
export default function ScoreRing({ value, size = 132 }) {
  const reduce = useReducedMotionSafe();
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (value || 0) / 10));
  const color = value >= 7 ? "var(--sage)" : value >= 4 ? "var(--haldi)" : "var(--danger)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--paper-2)" strokeWidth="10" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct) : c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="display text-5xl leading-none text-ink">{value}</div>
          <div className="text-sm text-muted mt-1">out of 10</div>
        </div>
      </div>
    </div>
  );
}
