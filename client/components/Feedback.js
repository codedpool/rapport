"use client";

const LABELS = { clarity: "Clarity", specificity: "Specificity", confidence: "Confidence", structure: "Structure" };

function Bar({ label, value }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "var(--sage)" : value >= 3 ? "var(--amber)" : "var(--accent)";
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-ink-2">{value} / 5</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-paper-2 overflow-hidden" role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={value} aria-label={label}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Quote({ text }) {
  if (!text) return null;
  return (
    <blockquote className="mt-2 border-l-2 border-accent pl-3 text-ink-2 italic">
      “{text}”
      <span className="not-italic ml-2 chip !text-[0.65rem] !py-0 align-middle" title="This quote was checked word for word against the transcript">verbatim</span>
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
      <div className="card p-6 sm:p-8 grid md:grid-cols-[auto_1fr] gap-8 items-center">
        <div className="text-center">
          <div className="display text-7xl leading-none">{feedback.overall}</div>
          <div className="text-sm text-muted mt-1">out of 10</div>
        </div>
        <div>
          <p className="text-lg leading-relaxed">{feedback.summary}</p>
          {feedback.language_note && <p className="mt-3 text-sm text-muted">{feedback.language_note}</p>}
        </div>
      </div>

      <div className="card p-6 sm:p-8 grid sm:grid-cols-2 gap-5">
        {Object.entries(LABELS).map(([k, label]) => (
          <Bar key={k} label={label} value={feedback.scores?.[k] || 1} />
        ))}
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
          <h3 className="font-semibold text-accent">What to sharpen</h3>
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
                  <div className="text-xs uppercase tracking-wider text-muted">Question</div>
                  <p className="mt-1">{ex.question}</p>
                  <Quote text={ex.your_answer_quote} />
                </div>
                <div className="rounded-xl bg-sage-soft p-4">
                  <div className="text-xs uppercase tracking-wider text-sage">Try something like</div>
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
          <span className="text-xs uppercase tracking-wider text-muted pt-1">
            {t.role === "candidate" ? "Candidate" : interviewer}
            <span className="block font-mono normal-case tracking-normal">{Math.floor((t.t || 0) / 60)}:{String((t.t || 0) % 60).padStart(2, "0")}</span>
          </span>
          <span className={t.role === "candidate" ? "rounded-xl bg-sage-soft px-3 py-2" : "py-2"}>
            {t.text}{t.interrupted && <span className="text-xs text-muted"> (interrupted)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
