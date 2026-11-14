"use client";

import { motion } from "motion/react";
import { BadgeCheck } from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";

const LABELS = { clarity: "Clarity", specificity: "Specificity", confidence: "Confidence", structure: "Structure" };

function Bar({ label, value }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "var(--sage)" : value >= 3 ? "var(--haldi)" : "var(--danger)";
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-ink-2">{value} / 5</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-paper-2 overflow-hidden" role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={value} aria-label={label}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
      </div>
    </div>
  );
}

function Quote({ text }) {
  if (!text) return null;
  return (
    <blockquote className="mt-2.5 flex items-start gap-2 rounded-xl bg-paper px-3 py-2.5 text-ink-2" lang="hi">
      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-sage" aria-label="Matches your words exactly" />
      <span>“{text}”</span>
    </blockquote>
  );
}

export default function Feedback({ feedback }) {
  if (!feedback) return null;
  if (feedback.error) {
    return <div className="card p-6 text-danger">Feedback could not be generated: {feedback.error}</div>;
  }
  if (feedback.insufficient) {
    return <div className="card p-6 text-ink-2">{feedback.summary}</div>;
  }
  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-8 sm:items-center">
          <ScoreRing value={feedback.overall} />
          <div>
            <p className="text-xl leading-relaxed text-ink">{feedback.summary}</p>
            {feedback.language_note && <p className="mt-3 text-muted">{feedback.language_note}</p>}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-line grid sm:grid-cols-2 gap-x-10 gap-y-4">
          {Object.entries(LABELS).map(([k, label]) => (
            <Bar key={k} label={label} value={feedback.scores?.[k] || 1} />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-sage">What worked</h3>
          <ul className="mt-3 space-y-4">
            {(feedback.strengths || []).map((s, i) => (
              <li key={i}>{s.point}<Quote text={s.quote} /></li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-haldi-ink">What to sharpen</h3>
          <ul className="mt-3 space-y-4">
            {(feedback.improvements || []).map((s, i) => (
              <li key={i}>{s.point}<Quote text={s.quote} /></li>
            ))}
          </ul>
        </div>
      </div>

      {(feedback.examples || []).length > 0 && (
        <div className="card p-6 sm:p-8">
          <h3 className="font-semibold">Even better answers</h3>
          <div className="mt-4 space-y-6">
            {feedback.examples.map((ex, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted">Question</div>
                  <p className="mt-1">{ex.question}</p>
                  <Quote text={ex.your_answer_quote} />
                </div>
                <div className="rounded-xl bg-sage-soft p-4">
                  <div className="text-sm font-semibold text-sage">Try something like</div>
                  <p className="mt-1 leading-relaxed">{ex.improved_answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {feedback.quotes_removed > 0 && (
        <p className="text-xs text-muted">
          {feedback.quotes_removed} quote(s) the model produced did not match your words exactly and were removed.
        </p>
      )}
    </div>
  );
}

export function Transcript({ turns, interviewer = "Interviewer" }) {
  if (!turns?.length) return <p className="text-muted">No transcript.</p>;
  return (
    <ol className="space-y-4">
      {turns.map((t, i) => (
        <li key={i} className={`grid grid-cols-[5.5rem_1fr] gap-3 ${t.role === "candidate" ? "" : "text-ink-2"}`}>
          <span className="text-sm text-muted pt-1">
            {t.role === "candidate" ? "Candidate" : interviewer}
            <span className="block tabular-nums">{Math.floor((t.t || 0) / 60)}:{String((t.t || 0) % 60).padStart(2, "0")}</span>
          </span>
          <span className={t.role === "candidate" ? "rounded-xl bg-sage-soft px-3 py-2" : "py-2"}>
            {t.text}{t.interrupted && <span className="text-xs text-muted"> (interrupted)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
