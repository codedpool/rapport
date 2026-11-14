"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import { DURATIONS, EMPTY_SPEC, TYPES } from "@/components/SpecFields";
import LaunchPanel from "@/components/LaunchPanel";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";

const STEPS = [
  { id: "role", label: "Role", image: "/images/practice.jpg", alt: "A candidate getting ready at his laptop" },
  { id: "style", label: "Style", image: "/images/conversation.jpg", alt: "Two people in conversation by a window" },
  { id: "start", label: "Start", image: "/images/gear.jpg", alt: "A microphone and headphones on a desk" },
];

const ROLE_IDEAS = ["Software Engineer", "Product Manager", "Data Analyst", "Sales Executive", "Customer Support", "Campus placement"];

const LANGS = [
  { id: "en", name: "English", sample: "Walk me through a project you're proud of.", lang: "en" },
  { id: "hi", name: "हिंदी", sample: "किसी ऐसे project के बारे में बताइए जिस पर आपको गर्व है।", lang: "hi" },
  { id: "hinglish", name: "Hinglish", sample: "Kisi aise project ke baare mein batao jis pe aapko proud feel hota hai.", lang: "en" },
];

export default function Wizard() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [spec, setSpec] = useState(EMPTY_SPEC);
  const [error, setError] = useState("");
  const set = (k) => (v) => setSpec((s) => ({ ...s, [k]: v }));

  const go = (to) => {
    if (to > step && step === 0 && spec.role.trim().length < 2) {
      setError("Name the role you're preparing for.");
      return;
    }
    setError("");
    setDir(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const slide = reduce
    ? {}
    : {
        initial: { opacity: 0, x: 40 * dir },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -40 * dir },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-14">
      {/* Image panel, one photo per step */}
      <div className="hidden lg:block">
        <div className="sticky top-24 aspect-[4/5] rounded-[1.75rem] overflow-hidden bg-night">
          <AnimatePresence initial={false}>
            <motion.div key={step} className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}>
              <Image src={STEPS[step].image} alt={STEPS[step].alt} fill sizes="40vw" className="object-cover" priority={step === 0} />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent" aria-hidden />
          <p className="absolute bottom-0 inset-x-0 p-7 text-white text-lg leading-relaxed">
            {step === 0 && "The questions are written for this role, from the job description if you add one."}
            {step === 1 && "Answer in whichever language comes naturally. It never affects your score."}
            {step === 2 && "Headphones give the best experience: you can interrupt the interviewer, like a real conversation."}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <Progress step={step} onJump={(i) => i < step && go(i)} />

        <div className="mt-8 relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} {...slide}>
              {step === 0 && <RoleStep spec={spec} set={set} onNext={() => go(1)} />}
              {step === 1 && <StyleStep spec={spec} set={set} />}
              {step === 2 && (
                <div>
                  <h1 className="display display-tight text-4xl sm:text-5xl text-accent">Connect and start</h1>
                  <p className="mt-3 text-lg text-ink-2">
                    {spec.role}, {spec.duration_min} minutes, {LANGS.find((l) => l.id === spec.language)?.name}.
                  </p>
                  <div className="mt-8"><LaunchPanel mode="mock" spec={spec} /></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {error && <p role="alert" className="mt-4 text-danger">{error}</p>}

        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={() => go(step - 1)}><ChevronLeft size={18} /> Back</button>
          ) : <span />}
          {step < 2 && <button className="btn btn-primary !px-6" onClick={() => go(step + 1)}>Continue</button>}
        </div>
      </div>
    </div>
  );
}

function Progress({ step, onJump }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
            <button
              onClick={() => onJump(i)}
              disabled={!done}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-2 text-[0.95rem] font-medium ${current ? "text-ink" : done ? "text-ink-2 hover:text-ink" : "text-muted"}`}
            >
              <span className={`h-7 w-7 rounded-full grid place-items-center text-sm transition-colors ${
                done ? "bg-sage text-white" : current ? "bg-accent text-white" : "bg-paper-2 text-muted"}`}>
                {done ? <Check size={15} /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <span className="relative flex-1 h-0.5 rounded-full bg-paper-2 overflow-hidden">
                <motion.span className="absolute inset-y-0 left-0 bg-sage" initial={false}
                  animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function RoleStep({ spec, set, onNext }) {
  const [more, setMore] = useState(Boolean(spec.job_description || spec.resume_highlights));
  return (
    <div>
      <h1 className="display display-tight text-4xl sm:text-5xl text-accent">What are you interviewing for?</h1>
      <label htmlFor="role" className="sr-only">Role</label>
      <input id="role" autoFocus maxLength={80} value={spec.role}
        onChange={(e) => set("role")(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onNext()}
        placeholder="e.g. Backend Engineer"
        className="mt-8 w-full bg-transparent border-0 border-b-2 border-line focus:border-accent outline-none text-3xl sm:text-4xl py-3 text-ink placeholder:text-[#b4bacb] transition-colors" />
      <div className="mt-5 flex flex-wrap gap-2">
        {ROLE_IDEAS.map((r) => (
          <button key={r} type="button" onClick={() => set("role")(r)}
            className={`chip !text-[0.9rem] !py-1.5 !px-3.5 transition-colors ${spec.role === r ? "!bg-accent !text-white !border-accent" : "hover:border-ink-2"}`}>
            {r}
          </button>
        ))}
      </div>

      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more}
        className="mt-10 flex items-center gap-2 text-accent font-semibold">
        <motion.span animate={{ rotate: more ? 180 : 0 }}><ChevronDown size={18} /></motion.span>
        Add a job description or resume notes
        <span className="font-normal text-muted">(sharper questions)</span>
      </button>
      <AnimatePresence initial={false}>
        {more && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="pt-5 space-y-5">
              <div>
                <label className="field-label" htmlFor="jd">Job description</label>
                <textarea id="jd" className="field min-h-32" maxLength={4000} value={spec.job_description}
                  onChange={(e) => set("job_description")(e.target.value)} placeholder="Paste it here" />
              </div>
              <div>
                <label className="field-label" htmlFor="resume">A few lines about your experience</label>
                <textarea id="resume" className="field min-h-20" maxLength={2000} value={spec.resume_highlights}
                  onChange={(e) => set("resume_highlights")(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="terms">Tools and terms you&apos;ll mention</label>
                <input id="terms" className="field" placeholder="Redis, Kubernetes, Salesforce"
                  defaultValue={(spec.keyterms || []).join(", ")}
                  onBlur={(e) => set("keyterms")(e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 60))} />
                <p className="hint">Helps speech recognition spell them right.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StyleStep({ spec, set }) {
  return (
    <div>
      <h1 className="display display-tight text-4xl sm:text-5xl text-accent">How should it go?</h1>

      <fieldset className="mt-8">
        <legend className="field-label">The interviewer speaks</legend>
        <div className="grid sm:grid-cols-3 gap-3">
          {LANGS.map((l) => {
            const on = spec.language === l.id;
            return (
              <button key={l.id} type="button" onClick={() => set("language")(l.id)} aria-pressed={on}
                className={`relative text-left rounded-2xl border p-4 transition-colors ${on ? "border-accent bg-accent text-white" : "border-line bg-white hover:border-ink-2"}`}>
                <span className="text-lg font-semibold">{l.name}</span>
                <span lang={l.lang} className={`mt-2 block text-[0.92rem] leading-snug ${on ? "text-white/80" : "text-muted"}`}>“{l.sample}”</span>
                {on && <Check size={18} className="absolute top-4 right-4 text-haldi" />}
              </button>
            );
          })}
        </div>
        <p className="hint">You can answer in any of the three, and switch the interviewer&apos;s language mid-way.</p>
      </fieldset>

      <div className="mt-8 grid sm:grid-cols-2 gap-6">
        <div>
          <span className="field-label">Kind of interview</span>
          <Segmented label="Kind of interview" value={spec.interview_type} options={TYPES} onChange={set("interview_type")} />
        </div>
        <div>
          <span className="field-label">Length</span>
          <Segmented label="Length" value={spec.duration_min} onChange={set("duration_min")}
            options={DURATIONS.map((d) => ({ id: d, label: `${d} min` }))} />
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        <Switch checked={spec.deep_followups} onChange={set("deep_followups")} title="Follow-up questions"
          body="Digs into vague answers, at most twice in a row." />
        <Switch checked={spec.pressure_mode} onChange={set("pressure_mode")} title="Pressure mode"
          body="Direct and sceptical. Pushes for numbers and trade-offs." />
      </div>
    </div>
  );
}
