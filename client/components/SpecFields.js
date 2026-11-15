"use client";

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "hinglish", label: "Hinglish" },
];
export const TYPES = [
  { id: "technical", label: "Technical" },
  { id: "hr", label: "HR" },
  { id: "mixed", label: "Mixed" },
];
export const DURATIONS = [5, 8, 12];

export const EMPTY_SPEC = {
  role: "",
  job_description: "",
  resume_highlights: "",
  interview_type: "mixed",
  duration_min: 8,
  language: "en",
  pressure_mode: false,
  deep_followups: true,
  keyterms: [],
  fixed_questions: [],
};

// One question per line. Blank lines are kept while typing; the server drops them.
export function QuestionsField({ id = "questions", value, onChange, label, hint }) {
  const lines = value || [];
  const count = lines.filter((q) => q.trim()).length;
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <textarea id={id} className="field min-h-28" maxLength={2000} value={lines.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        placeholder={"One question per line, for example:\nWalk me through a project you're proud of. What did you build yourself?\nHow would you design a rate limiter for a payments API?"} />
      <p className={`hint ${count > 6 ? "!text-danger" : ""}`}>{count > 6 ? `Keep it to 6 questions (you have ${count}).` : hint}</p>
    </div>
  );
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={String(o.id)} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, title, body }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </label>
  );
}

export default function SpecFields({ spec, onChange }) {
  const set = (k) => (v) => onChange({ ...spec, [k]: v });
  return (
    <div className="space-y-5">
      <div>
        <label className="field-label" htmlFor="role">Role</label>
        <input id="role" className="field" maxLength={80} placeholder="e.g. Backend Engineer, Product Manager, Sales Associate"
          value={spec.role} onChange={(e) => set("role")(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="jd">Job description <span className="text-muted font-normal">(optional, makes questions sharper)</span></label>
        <textarea id="jd" className="field min-h-28" maxLength={4000} value={spec.job_description}
          onChange={(e) => set("job_description")(e.target.value)} placeholder="Paste the job description" />
      </div>
      <div>
        <label className="field-label" htmlFor="resume">Resume highlights <span className="text-muted font-normal">(optional)</span></label>
        <textarea id="resume" className="field min-h-20" maxLength={2000} value={spec.resume_highlights}
          onChange={(e) => set("resume_highlights")(e.target.value)} placeholder="A few lines about the candidate's experience" />
      </div>
      <QuestionsField value={spec.fixed_questions} onChange={set("fixed_questions")}
        label={<>Your questions <span className="text-muted font-normal">(optional, up to 6)</span></>}
        hint="Every candidate gets the same questions, asked in order in the interview language, with live follow-ups. Leave empty to have Rapport write them." />
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <span className="field-label">Interview type</span>
          <Seg label="Interview type" value={spec.interview_type} options={TYPES} onChange={set("interview_type")} />
        </div>
        <div>
          <span className="field-label">Length</span>
          <Seg label="Length" value={spec.duration_min} options={DURATIONS.map((d) => ({ id: d, label: `${d} min` }))} onChange={set("duration_min")} />
        </div>
      </div>
      <div>
        <span className="field-label">Interviewer speaks</span>
        <Seg label="Language" value={spec.language} options={LANGUAGES} onChange={set("language")} />
        <p className="hint">The candidate can always answer in any of the three. Language never affects the score.</p>
      </div>
      <div>
        <label className="field-label" htmlFor="terms">Key terms <span className="text-muted font-normal">(helps speech recognition: tools, names, jargon)</span></label>
        <input id="terms" className="field" placeholder="Redis, Kubernetes, P&L, Salesforce"
          defaultValue={(spec.keyterms || []).join(", ")}
          onBlur={(e) => set("keyterms")(e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 60))} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 pt-1">
        <Toggle checked={spec.deep_followups} onChange={set("deep_followups")} title="Deep follow-ups"
          body="Drills into vague answers, at most two follow-ups in a row." />
        <Toggle checked={spec.pressure_mode} onChange={set("pressure_mode")} title="Pressure mode"
          body="Direct and skeptical. Pushes for numbers and trade-offs." />
      </div>
    </div>
  );
}
