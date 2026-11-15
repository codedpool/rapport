"use client";

import { useState } from "react";
import { motion } from "motion/react";
import ScoreRing from "@/components/ui/ScoreRing";
import { SWEET_SPOT, analyse, fmtClock, fmtDuration, oneThing, verdict } from "@/lib/reportStats";

const YOU = "#6c5ce0"; // focus: the candidate
const THEM = "#d6d0e4"; // context: the interviewer

const CHECKS = [
  ["situation", "A real situation"],
  ["you", "Your part, in “I”"],
  ["number", "A number"],
  ["reason", "The why"],
];
const CHECK_NOUN = { situation: "a real situation", you: "your own part", number: "a number", reason: "the reason behind the choice" };

// ---------- the coach's note: the one thing to change ----------

function CoachNote({ one }) {
  return (
    <section className="rounded-[1.75rem] bg-cream border border-[#f1e6da] px-6 sm:px-10 py-8 sm:py-10">
      <p className="text-ink-2">If you change one thing before your next interview</p>
      <h2 className="display mt-3 text-[2.1rem] sm:text-[2.9rem] leading-[1.08] text-accent max-w-3xl">{one.headline}</h2>
      {one.why && <p className="mt-4 text-lg text-ink-2 leading-relaxed max-w-2xl">{one.why}</p>}
      {one.tryThis && (
        <div className="mt-7 grid md:grid-cols-2 gap-x-10 gap-y-5 max-w-4xl">
          <div>
            <p className="text-sm text-muted">You said</p>
            <p className="mt-1.5 text-lg text-ink-2 leading-relaxed line-through decoration-[#c9bfd9] decoration-1" lang="hi">{one.tryThis.before}</p>
          </div>
          <div>
            <p className="text-sm text-sage font-medium">Try saying</p>
            <p className="mt-1.5 text-lg text-ink leading-relaxed" lang="hi">{one.tryThis.after}</p>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- score, kept deliberately quieter than the advice ----------

function ScoreLine({ feedback }) {
  const dims = [["clarity", "Clarity"], ["specificity", "Specificity"], ["confidence", "Confidence"], ["structure", "Structure"]];
  return (
    <section className="mt-12 grid md:grid-cols-[auto_1fr] gap-x-10 gap-y-6 items-start">
      <div className="flex md:flex-col items-center gap-4">
        <ScoreRing value={feedback.overall} size={128} />
        <span className="text-ink font-medium">{verdict(feedback.overall)}</span>
      </div>
      <div>
        <p className="text-xl leading-relaxed text-ink max-w-3xl">{feedback.summary}</p>
        <dl className="mt-6 grid sm:grid-cols-2 gap-x-10 gap-y-3 max-w-3xl">
          {dims.map(([k, label]) => {
            const v = feedback.scores?.[k] || 1;
            return (
              <div key={k} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3">
                <dt className="text-ink-2">{label}</dt>
                <dd className="flex gap-[2px]" aria-label={`${label} ${v} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className="h-2 flex-1 first:rounded-l-full last:rounded-r-full" style={{ background: n <= v ? YOU : "var(--paper-2)" }} />
                  ))}
                </dd>
                <span className="text-right tabular-nums text-ink">{v}/5</span>
              </div>
            );
          })}
        </dl>
        {feedback.language_note && <p className="mt-5 text-sm text-muted max-w-3xl">{feedback.language_note}</p>}
      </div>
    </section>
  );
}

// ---------- figures ----------

function Figure({ title, lede, children }) {
  return (
    <section className="mt-16">
      <h3 className="display display-tight text-[1.65rem] sm:text-[2rem] text-accent max-w-3xl">{title}</h3>
      {lede && <p className="mt-2 text-ink-2 max-w-2xl leading-relaxed">{lede}</p>}
      <div className="mt-6 rounded-[1.5rem] bg-white border border-line p-5 sm:p-7 overflow-hidden">{children}</div>
    </section>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
      {items.map(([label, color, hollow]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={hollow ? "h-2.5 w-4 rounded-sm" : "h-2.5 w-2.5 rounded-full"}
            style={hollow ? { background: "var(--sage-soft)", boxShadow: `inset 0 0 0 1px ${color}` } : { background: color }} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}

// The whole interview as one strip: each turn sized by how much was said.
function Ribbon({ a }) {
  const [hover, setHover] = useState(null);
  const total = a.ribbon.reduce((s, r) => s + Math.max(r.words, 3), 0) || 1;
  const segs = a.ribbon.map((r, i) => ({ ...r, q: a.ribbon.slice(0, i + 1).filter((x) => x.who === "them").length }));
  const shown = hover !== null ? segs[hover] : null;
  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Legend items={[["You", YOU], ["Interviewer", THEM]]} />
        <span className="text-sm text-muted">{fmtDuration(a.duration)} in total. Hover a block to read it.</span>
      </div>
      <div className="mt-4 flex h-14 gap-[2px]" role="img"
        aria-label={`Conversation of ${segs.length} turns. You spoke ${Math.round(a.youShare * 100)} percent of the words.`}
        onMouseLeave={() => setHover(null)}>
        {segs.map((s, i) => (
          <motion.button type="button" key={i} aria-label={`${s.who === "you" ? "Your answer" : `Question ${s.q}`}, ${s.words} words`}
            onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
            className="h-full first:rounded-l-xl last:rounded-r-xl origin-left focus-visible:outline-2"
            style={{ flexGrow: Math.max(s.words, 3), flexBasis: 0, minWidth: 4, background: s.who === "you" ? YOU : THEM, opacity: hover === null || hover === i ? 1 : 0.45 }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }} />
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] text-xs text-muted" aria-hidden>
        {segs.map((s, i) => (
          <span key={i} style={{ flexGrow: Math.max(s.words, 3), flexBasis: 0, minWidth: 4 }} className="truncate">
            {s.who === "them" && (Math.max(s.words, 3) / total > 0.05 ? `Q${s.q}` : "")}
          </span>
        ))}
      </div>
      <div className="mt-4 min-h-[4.5rem] rounded-xl bg-paper px-4 py-3">
        {shown ? (
          <>
            <p className="text-sm text-muted">{shown.who === "you" ? `Your answer to question ${shown.q}` : `Question ${shown.q}`}, at {fmtClock(shown.t)}, {shown.words} words</p>
            <p className="mt-1 text-ink line-clamp-2" lang="hi">{shown.text}</p>
          </>
        ) : (
          <p className="text-ink-2 py-2">
            You spoke {Math.round(a.youShare * 100)}% of the words.{" "}
            {a.hindiShare > 0.05 && `About ${Math.round(a.hindiShare * 100)}% of yours were in Hindi script, which never affects the score.`}
          </p>
        )}
      </div>
    </div>
  );
}

// Each answer's length against the range strong spoken answers usually fall in.
function Lengths({ a }) {
  const max = Math.max(300, ...a.items.map((x) => x.words)) * 1.05;
  const pct = (w) => `${(w / max) * 100}%`;
  const ticks = [0, 100, 200, 300].filter((t) => t <= max);
  return (
    <div>
      <Legend items={[["Your answer", YOU], [`Usual range for a strong answer (${SWEET_SPOT[0]}–${SWEET_SPOT[1]} words, about 45–95 seconds)`, "var(--sage)", true]]} />
      <ol className="mt-5 space-y-4">
        {a.items.map((x) => (
          <li key={x.n} className="grid sm:grid-cols-[14rem_1fr] gap-x-5 gap-y-1.5 items-center">
            <p className="text-ink-2 text-[0.95rem] line-clamp-2" title={x.question}>
              <span className="text-ink font-medium">Q{x.n}</span> {x.question}
            </p>
            <div className="relative h-7">
              <div className="absolute inset-y-0 rounded-md bg-sage-soft" style={{ left: pct(SWEET_SPOT[0]), width: pct(SWEET_SPOT[1] - SWEET_SPOT[0]) }} aria-hidden />
              <div className="absolute left-0 top-1.5 bottom-1.5 rounded-r-md" style={{ width: pct(Math.max(x.words, 2)), background: YOU }}
                title={`${x.words} words, about ${x.secs} seconds`} />
              <span className="absolute top-1/2 -translate-y-1/2 text-sm text-ink tabular-nums whitespace-nowrap"
                style={{ left: `calc(${pct(Math.max(x.words, 2))} + 8px)` }}>
                {x.words} words, about {x.secs}s
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 sm:ml-[19.25rem] relative h-5 text-xs text-muted tabular-nums" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// What each answer contained, checked against the four things interviewers listen for.
function Anatomy({ a }) {
  return (
    <div>
      <div>
        <table className="w-full text-left table-fixed">
          <caption className="sr-only">Which parts each answer contained</caption>
          <thead>
            <tr className="text-sm text-muted">
              <th scope="col" className="font-normal pb-3 pr-2 w-14 sm:w-auto">Answer</th>
              {CHECKS.map(([k, label]) => <th key={k} scope="col" className="font-normal pb-3 px-1 text-center text-xs sm:text-sm leading-tight align-bottom">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {a.items.map((x) => (
              <tr key={x.n} className="border-t border-line">
                <th scope="row" className="py-3 pr-2 font-normal text-ink-2">
                  <span className="text-ink font-medium">Q{x.n}</span>
                  <span className="hidden sm:block line-clamp-1" title={x.question}>{x.question}</span>
                </th>
                {CHECKS.map(([k]) => (
                  <td key={k} className="py-3 px-2 text-center">
                    <span className="inline-block h-4 w-4 rounded-full align-middle"
                      style={x.checks[k] ? { background: YOU } : { boxShadow: "inset 0 0 0 2px #cfc7de" }} aria-hidden />
                    <span className="sr-only">{x.checks[k] ? "Yes" : "No"}</span>
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line text-sm text-ink-2">
              <th scope="row" className="pt-3 pr-2 font-normal"><span className="hidden sm:inline">Answers with it</span><span className="sm:hidden">Total</span></th>
              {CHECKS.map(([k]) => (
                <td key={k} className="pt-3 px-1 text-center tabular-nums">{a.items.length - a.missing[k]}/{a.items.length}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid md:grid-cols-2 gap-x-10 gap-y-4 text-[0.97rem]">
        <p className="text-ink-2">
          <span className="text-ink font-medium">“I” {a.I} {a.I === 1 ? "time" : "times"}, “we” {a.WE} {a.WE === 1 ? "time" : "times"}.</span>{" "}
          {a.WE > a.I ? "Interviewers listen for your own part. Swap a few “we”s for what you personally did." : "Good: you made your own role clear."}
        </p>
        <p className="text-ink-2">
          <span className="text-ink font-medium">Numbers you used: </span>
          {a.items.flatMap((x) => x.numbers).length
            ? a.items.flatMap((x) => x.numbers).slice(0, 8).map((n, i) => <span key={i} className="inline-block mr-2" lang="hi">“{n}”</span>)
            : "none yet. A result with a number is the easiest way to make an answer stick."}
        </p>
      </div>
      <p className="mt-5 text-sm text-muted">Spotted automatically from your words in English, Hindi and Hinglish, so treat these as hints. They are not part of your score.</p>
    </div>
  );
}

// ---------- what the interviewer's notes say, in the candidate's words ----------

function Notes({ feedback }) {
  const block = (title, color, list) => (
    <div>
      <h4 className="font-medium text-ink">{title}</h4>
      <ul className="mt-4 space-y-6">
        {(list || []).map((s, i) => (
          <li key={i} className="pl-4 border-l-[3px]" style={{ borderColor: color }}>
            <p className="text-ink leading-relaxed">{s.point}</p>
            {s.quote && <p className="mt-2 text-ink-2 italic" lang="hi">“{s.quote}”</p>}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section className="mt-16">
      <h3 className="display display-tight text-[1.65rem] sm:text-[2rem] text-accent">What the interviewer would remember</h3>
      <p className="mt-2 text-ink-2 max-w-2xl">Quotes are your exact words, checked against the transcript.</p>
      <div className="mt-7 grid md:grid-cols-2 gap-x-12 gap-y-10">
        {block("Worked in your favour", "var(--sage)", feedback.strengths)}
        {block("Held you back", "var(--haldi)", feedback.improvements)}
      </div>
      {feedback.quotes_removed > 0 && (
        <p className="mt-5 text-sm text-muted">
          {feedback.quotes_removed} paraphrased {feedback.quotes_removed === 1 ? "quote was" : "quotes were"} left out because {feedback.quotes_removed === 1 ? "it" : "they"} didn&apos;t match your exact words.
        </p>
      )}
    </section>
  );
}

function Rewrites({ examples }) {
  if (!examples?.length) return null;
  return (
    <section className="mt-16">
      <h3 className="display display-tight text-[1.65rem] sm:text-[2rem] text-accent">The same answers, made stronger</h3>
      <div className="mt-7 space-y-10">
        {examples.map((ex, i) => (
          <article key={i} className="max-w-4xl">
            <p className="text-ink font-medium">{ex.question}</p>
            <div className="mt-4 grid md:grid-cols-2 gap-x-10 gap-y-4">
              <div className="pl-4 border-l-[3px] border-[#d6d0e4]">
                <p className="text-sm text-muted">You said</p>
                <p className="mt-1.5 text-ink-2 italic leading-relaxed" lang="hi">
                  {ex.your_answer_quote ? `“${ex.your_answer_quote}”` : "Your answer was paraphrased by the reviewer, so it isn't quoted here."}
                </p>
              </div>
              <div className="pl-4 border-l-[3px] border-sage">
                <p className="text-sm text-sage font-medium">A stronger version</p>
                <p className="mt-1.5 text-ink leading-relaxed">{ex.improved_answer}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Conversation({ turns, interviewer = "Interviewer" }) {
  if (!turns?.length) return <p className="text-muted">No transcript.</p>;
  const numbers = turns.map((t, i) => turns.slice(0, i + 1).filter((x) => x.role !== "candidate").length);
  return (
    <ol className="space-y-4">
      {turns.map((t, i) => {
        const mine = t.role === "candidate";
        return (
          <li key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-5 py-3.5 ${mine ? "bg-violet-soft rounded-br-lg" : "bg-white border border-line rounded-bl-lg"}`}>
              <div className="flex items-center gap-2 text-xs text-muted mb-1">
                <span className="font-semibold text-ink-2">{mine ? "You" : `${interviewer}, question ${numbers[i]}`}</span>
                <span className="tabular-nums">{fmtClock(t.t)}</span>
                {t.interrupted && <span>(you cut in)</span>}
              </div>
              <p className="text-ink leading-relaxed" lang="hi">{t.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Report({ feedback, transcript, durationS }) {
  const a = analyse(transcript, durationS);
  const one = oneThing(a, feedback);
  const worst = Object.entries(a.missing).sort((x, y) => y[1] - x[1])[0];
  const lengthTitle = a.avgWords < SWEET_SPOT[0]
    ? "Your answers were shorter than interviewers expect."
    : a.avgWords > SWEET_SPOT[1] ? "Your answers ran longer than they needed to." : "Your answers were about the right length.";
  const anatomyTitle = worst && worst[1] > 0
    ? `${worst[1]} of ${a.items.length} ${a.items.length === 1 ? "answer was" : "answers were"} missing ${CHECK_NOUN[worst[0]]}.`
    : "Every answer had the four things interviewers listen for.";
  return (
    <div>
      <CoachNote one={one} />
      <ScoreLine feedback={feedback} />
      {a.items.length > 0 && (
        <>
          <Figure title={a.youShare >= 0.55 ? "You carried the conversation." : "The interviewer did more of the talking than you."}
            lede="The whole interview, start to finish. Each block is one turn, sized by how much was said.">
            <Ribbon a={a} />
          </Figure>
          <Figure title={lengthTitle} lede={`On average about ${a.avgSecs} seconds per answer.`}>
            <Lengths a={a} />
          </Figure>
          <Figure title={anatomyTitle} lede="Strong answers name a real situation, say what you did, give a number and explain why.">
            <Anatomy a={a} />
          </Figure>
        </>
      )}
      <Notes feedback={feedback} />
      <Rewrites examples={feedback.examples} />
      <section className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
        <p className="text-lg text-ink-2 max-w-xl">Try the same role again with the note above in mind, and compare the two reports.</p>
        <a href="/practice" className="btn btn-accent">Practise this again</a>
      </section>
    </div>
  );
}
