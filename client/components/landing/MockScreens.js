"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AudioLines, BadgeCheck, Check, Pause, Square, Sparkles, Timer } from "lucide-react";
import Logo from "@/components/Logo";

// Orange voice orb with live waveform bars.
export function VoiceOrb({ size = 128 }) {
  const reduce = useReducedMotion();
  const bars = [0.35, 0.6, 0.9, 0.55, 1, 0.7, 0.45, 0.8, 0.5];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {!reduce && [0, 1].map((r) => (
        <motion.span key={r} aria-hidden className="absolute inset-0 rounded-full bg-haldi/25"
          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: r * 1.2, ease: "easeOut" }} />
      ))}
      <div className="relative h-full w-full rounded-full grid place-items-center"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffd7a8, #f59a4a 45%, #e8601f 100%)", boxShadow: "0 20px 50px -12px rgba(232,96,31,0.6)" }}>
        <div className="flex items-center gap-[3px]">
          {bars.map((b, i) => (
            <motion.span key={i} className="w-[3px] rounded-full bg-white"
              style={{ height: size * 0.32 * b }}
              animate={reduce ? {} : { scaleY: [0.5, 1, 0.6, 0.9, 0.5] }}
              transition={{ duration: 1.1 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockFrame({ children, label }) {
  return (
    <div className="iris">
      <div className="bg-cream p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <span className="hidden sm:inline text-sm text-ink-2">{label}</span>
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-sm tabular-nums">
            <Timer size={14} /> 04:26
          </span>
        </div>
        <div className="mt-6 min-h-[22rem]">{children}</div>
      </div>
    </div>
  );
}

function Typing({ text, speed = 45 }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const t = setInterval(() => {
      i = i >= text.length + 40 ? 0 : i + 1;
      setN(Math.min(i, text.length));
    }, speed);
    return () => clearInterval(t);
  }, [text, speed, reduce]);
  return <>{text.slice(0, n)}{n < text.length && <span className="inline-block w-0.5 h-4 bg-violet align-[-2px] ml-0.5 animate-pulse" />}</>;
}

export function ChooseScreen() {
  return (
    <MockFrame label="New practice interview">
      <p className="text-sm text-muted">Role</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {["SDE (Frontend)", "Product Manager", "Data Analyst", "Sales"].map((r, i) => (
          <span key={r} className={`chip !py-1.5 !px-3.5 ${i === 0 ? "!bg-accent !text-white !border-accent" : ""}`}>{r}</span>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">Interviewer speaks</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[["English", "Tell me about a project…"], ["हिंदी", "किसी project के बारे में…"], ["Hinglish", "Kisi project ke baare mein…"]].map(([n, s], i) => (
          <div key={n} className={`rounded-2xl border p-3 ${i === 2 ? "border-haldi bg-haldi-soft" : "border-line bg-white"}`}>
            <div className="font-medium flex items-center justify-between">{n}{i === 2 && <Check size={15} className="text-haldi" />}</div>
            <div className="mt-1 text-xs text-muted leading-snug">{s}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">Length</p>
      <div className="mt-2 seg">
        {["5 min", "8 min", "12 min"].map((d, i) => <button key={d} aria-pressed={i === 1} tabIndex={-1}>{d}</button>)}
      </div>
    </MockFrame>
  );
}

export function SpeakScreen() {
  return (
    <MockFrame label="AI Interview, SDE (Frontend)">
      <div className="grid place-items-center"><VoiceOrb size={120} /></div>
      <div className="mt-7 rounded-2xl bg-white border border-line px-4 py-3 flex gap-3 shadow-sm">
        <Sparkles size={18} className="text-haldi shrink-0 mt-0.5" />
        <p className="text-[0.95rem]">Can you tell me about a challenging project you worked on, and how you solved it?</p>
      </div>
      <div className="mt-3 ml-6 rounded-2xl bg-violet-soft px-4 py-3 flex gap-3">
        <AudioLines size={18} className="text-violet shrink-0 mt-0.5" />
        <p className="text-[0.95rem] text-ink-2 min-h-[3em]" lang="hi">
          <Typing text="मैंने React और WebSockets से एक real-time editor बनाया था, सबसे बड़ा challenge conflicts handle करना था…" />
        </p>
      </div>
      <div className="mt-6 flex items-center justify-center gap-4">
        <span className="chip !py-1.5 !px-4"><Pause size={14} /> Pause</span>
        <span className="h-11 w-11 rounded-full bg-danger grid place-items-center text-white shadow-lg"><Square size={16} fill="currentColor" /></span>
        <span className="chip !py-1.5 !px-4">End interview</span>
      </div>
    </MockFrame>
  );
}

export function FeedbackScreen() {
  const reduce = useReducedMotion();
  const rows = [["Clarity", 4], ["Specificity", 4], ["Confidence", 3], ["Structure", 3]];
  return (
    <MockFrame label="Your scorecard">
      <div className="flex items-center gap-6">
        <MiniRing value={7} />
        <div className="flex-1 space-y-3">
          {rows.map(([k, v], i) => (
            <div key={k}>
              <div className="flex justify-between text-sm"><span>{k}</span><span className="text-muted">{v}/5</span></div>
              <div className="mt-1 h-2 rounded-full bg-paper-2 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: v >= 4 ? "var(--sage)" : "var(--violet)" }}
                  initial={{ width: reduce ? `${v * 20}%` : 0 }} animate={{ width: `${v * 20}%` }} transition={{ duration: 0.9, delay: 0.1 * i }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-sage-soft p-4 flex gap-3">
        <BadgeCheck size={20} className="text-sage shrink-0 mt-0.5" />
        <div>
          <p className="text-[0.95rem]">You backed the decision with a measured result.</p>
          <p className="mt-1 text-[0.95rem] text-ink-2 italic" lang="hi">“sabse bada challenge conflicts handle karna tha”</p>
        </div>
      </div>
    </MockFrame>
  );
}

export function MiniRing({ value, size = 112 }) {
  const reduce = useReducedMotion();
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--paper-2)" strokeWidth="9" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="var(--haldi)" strokeWidth="9" fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: reduce ? c * (1 - value / 10) : c }}
          animate={{ strokeDashoffset: c * (1 - value / 10) }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><span className="display text-4xl text-accent">{value}</span><span className="text-muted">/10</span></div>
      </div>
    </div>
  );
}
