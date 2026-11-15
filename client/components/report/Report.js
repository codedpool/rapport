"use client";

import { motion } from "motion/react";
import {
  ArrowUpRight, BadgeCheck, Clock, Languages, Lightbulb, MessageCircle, MessagesSquare,
  Sparkles, Target, TrendingUp, Type, Undo2,
} from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";
import { computeStats, fmtClock, fmtDuration, verdict } from "@/lib/reportStats";

// Validated pair (dataviz validator, light surface): passes CVD, normal-vision and 3:1 contrast.
const C_YOU = "#6c5ce0";
const C_OTHER = "#e8601f";

const DIMENSIONS = [
  ["clarity", "Clarity", "Was each answer easy to follow?"],
  ["specificity", "Specificity", "Concrete examples, names and numbers."],
  ["confidence", "Confidence", "Conviction and ownership of the work. Not fluency or accent."],
  ["structure", "Structure", "A clear arc: situation, what you did, the result."],
];

function Section({ title, subtitle, children, className = "" }) {
  return (
    <section className={`mt-10 ${className}`}>
      <h2 className="display display-tight text-2xl sm:text-[1.75rem] text-accent">{title}</h2>
      {subtitle && <p className="mt-1 text-ink-2">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Quote({ text }) {
  if (!text) return null;
  return (
    <blockquote className="mt-3 flex items-start gap-2 rounded-xl bg-paper px-3.5 py-2.5 text-ink-2" lang="hi">
      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-sage" aria-label="Matches your words exactly" />
      <span>“{text}”</span>
    </blockquote>
  );
}

function StatTile({ icon: Icon, label, value, note }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-muted text-[0.92rem]">
        <Icon size={16} aria-hidden /> {label}
      </div>
      <div className="mt-2 display text-[2rem] leading-none text-ink">{value}</div>
      {note && <div className="mt-2 text-sm text-muted">{note}</div>}
    </div>
  );
}

// Two-part bar: 2px surface gap, rounded outer ends, legend with values in ink.
function SplitBar({ title, a, b, note }) {
  const pa = Math.round(a.share * 100);
  const pb = 100 - pa;
  return (
    <div className="card p-5">
      <div className="text-muted text-[0.92rem]">{title}</div>
      <div className="mt-3 flex h-3 gap-[2px]" role="img" aria-label={`${a.label} ${pa}%, ${b.label} ${pb}%`}>
        {pa > 0 && <motion.div title={`${a.label}: ${pa}%`} className="h-full rounded-l-full" style={{ background: a.color, borderTopRightRadius: pb ? 0 : 999, borderBottomRightRadius: pb ? 0 : 999 }}
          initial={{ width: 0 }} animate={{ width: `${pa}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />}
        {pb > 0 && <div title={`${b.label}: ${pb}%`} className="h-full flex-1 rounded-r-full" style={{ background: b.color, borderTopLeftRadius: pa ? 0 : 999, borderBottomLeftRadius: pa ? 0 : 999 }} />}
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
        {[[a, pa], [b, pb]].map(([s, p]) => (
          <span key={s.label} className="flex items-center gap-1.5 text-ink-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label} <span className="font-semibold text-ink tabular-nums">{p}%</span>
          </span>
        ))}
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </div>
  );
}

export function Overview({ feedback, stats }) {
  const v = verdict(feedback.overall);
  const top = feedback.strengths?.[0];
  const focus = feedback.improvements?.[0];
  return (
    <div className="card overflow-hidden">
      <div className="p-6 sm:p-8 grid lg:grid-cols-[auto_1fr] gap-8 items-center">
        <div className="flex flex-col items-center gap-3">
          <ScoreRing value={feedback.overall} size={168} />
          <span className={`chip !border-transparent ${v.tone === "good" ? "!bg-sage-soft !text-sage" : "!bg-haldi-soft !text-haldi-ink"}`}>
            {v.tone === "good" ? <TrendingUp size={14} aria-hidden /> : <Target size={14} aria-hidden />} {v.label}
          </span>
        </div>
        <div>
          <p className="text-xl sm:text-[1.35rem] leading-relaxed text-ink">{feedback.summary}</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {top && (
              <div className="rounded-2xl bg-sage-soft p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-sage"><Sparkles size={15} aria-hidden /> Your best moment</div>
                <p className="mt-1 text-ink">{top.point}</p>
              </div>
            )}
            {focus && (
              <div className="rounded-2xl bg-haldi-soft p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-haldi-ink"><Target size={15} aria-hidden /> Focus next time</div>
                <p className="mt-1 text-ink">{focus.point}</p>
              </div>
            )}
          </div>
          {feedback.language_note && (
            <p className="mt-5 flex items-start gap-2 text-sm text-muted"><Languages size={16} className="mt-0.5 shrink-0" aria-hidden /> {feedback.language_note}</p>
          )}
        </div>
      </div>
      <div className="border-t border-line bg-paper/60 px-6 sm:px-8 py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-2">
        <span><span className="font-semibold text-ink">{stats.answers}</span> answers</span>
        <span><span className="font-semibold text-ink">{fmtDuration(stats.duration)}</span> in conversation</span>
        <span><span className="font-semibold text-ink">{stats.youWords}</span> words from you</span>
      </div>
    </div>
  );
}

export function Skills({ scores }) {
  return (
    <div className="card p-6 sm:p-8 grid md:grid-cols-2 gap-x-10 gap-y-6">
      {DIMENSIONS.map(([k, label, hint], i) => {
        const v = scores?.[k] || 1;
        return (
          <div key={k}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-ink">{label}</span>
              <span className="tabular-nums text-ink"><span className="display text-2xl">{v}</span><span className="text-muted">/5</span></span>
            </div>
            <div className="mt-2 flex gap-[2px]" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={5} aria-valuenow={v}>
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.span key={n} className="h-2.5 flex-1 first:rounded-l-full last:rounded-r-full"
                  style={{ background: n <= v ? C_YOU : "var(--paper-2)" }}
                  initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 * i + 0.06 * n }} />
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">{hint}</p>
          </div>
        );
      })}
    </div>
  );
}

export function Stats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile icon={Clock} label="Duration" value={fmtDuration(stats.duration)} note={`${stats.questions} questions asked`} />
      <StatTile icon={MessageCircle} label="Average answer" value={`${stats.avgAnswerWords} words`} note={`Longest: ${stats.longestAnswerWords} words`} />
      <StatTile icon={Clock} label="Time per answer" value={stats.avgAnswerTime ? `${stats.avgAnswerTime}s` : "–"} note="Including thinking time" />
      <StatTile icon={Undo2} label="You interrupted" value={stats.interruptions} note={stats.interruptions ? "Times you cut in mid-question" : "Let every question finish"} />
      <div className="col-span-2">
        <SplitBar title="Who did the talking" a={{ label: "You", share: stats.talkShare, color: C_YOU }}
          b={{ label: "Interviewer", color: C_OTHER }}
          note={stats.talkShare >= 0.6 ? "You carried the conversation, as you should." : "In a good interview the candidate talks most of the time."} />
      </div>
      <div className="col-span-2">
        <SplitBar title="Your language mix (by words)" a={{ label: "Hindi script", share: stats.hindiShare, color: C_YOU }}
          b={{ label: "English", color: C_OTHER }} note="Shown for interest only. Language never affects your score." />
      </div>
      <div className="col-span-2 lg:col-span-4">
        <div className="card p-5 flex flex-wrap items-center gap-4">
          <span className="h-10 w-10 rounded-xl bg-violet-soft text-violet grid place-items-center"><Type size={18} aria-hidden /></span>
          <div className="flex-1 min-w-[12rem]">
            <div className="font-semibold text-ink">
              {stats.fillers} filler {stats.fillers === 1 ? "word" : "words"}
              <span className="font-normal text-muted"> (um, uh, basically, matlab…)</span>
            </div>
            <p className="text-sm text-muted">For your awareness only. Fillers are never counted against you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Highlights({ feedback }) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="card p-6">
        <h3 className="flex items-center gap-2 font-semibold text-sage"><Sparkles size={18} aria-hidden /> What worked</h3>
        <ol className="mt-4 space-y-5">
          {(feedback.strengths || []).map((s, i) => (
            <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2">
              <span className="h-7 w-7 rounded-full bg-sage-soft text-sage text-sm font-semibold grid place-items-center">{i + 1}</span>
              <div><p className="text-ink">{s.point}</p><Quote text={s.quote} /></div>
            </li>
          ))}
        </ol>
      </div>
      <div className="card p-6">
        <h3 className="flex items-center gap-2 font-semibold text-haldi-ink"><Target size={18} aria-hidden /> What to sharpen</h3>
        <ol className="mt-4 space-y-5">
          {(feedback.improvements || []).map((s, i) => (
            <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2">
              <span className="h-7 w-7 rounded-full bg-haldi-soft text-haldi-ink text-sm font-semibold grid place-items-center">{i + 1}</span>
              <div><p className="text-ink">{s.point}</p><Quote text={s.quote} /></div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function BetterAnswers({ examples }) {
  if (!examples?.length) return null;
  return (
    <div className="space-y-5">
      {examples.map((ex, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-line bg-paper/60 flex items-start gap-3">
            <MessagesSquare size={18} className="mt-1 shrink-0 text-violet" aria-hidden />
            <p className="text-ink font-medium">{ex.question}</p>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="p-6 md:border-r border-line">
              <div className="text-sm font-semibold text-muted">What you said</div>
              {ex.your_answer_quote ? <Quote text={ex.your_answer_quote} /> : <p className="mt-3 text-muted">Paraphrased in the feedback, so not quoted here.</p>}
            </div>
            <div className="p-6 bg-sage-soft/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-sage"><Lightbulb size={15} aria-hidden /> A stronger version</div>
              <p className="mt-3 text-ink leading-relaxed">{ex.improved_answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Conversation({ turns, interviewer = "Interviewer" }) {
  if (!turns?.length) return <p className="text-muted">No transcript.</p>;
  const numbers = turns.map((t, i) => turns.slice(0, i + 1).filter((x) => x.role !== "candidate").length);
  return (
    <ol className="space-y-4">
      {turns.map((t, i) => {
        const mine = t.role === "candidate";
        const q = numbers[i];
        return (
          <li key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-5 py-3.5 ${mine ? "bg-violet-soft rounded-br-lg" : "bg-white border border-line rounded-bl-lg"}`}>
              <div className="flex items-center gap-2 text-xs text-muted mb-1">
                <span className="font-semibold text-ink-2">{mine ? "You" : `${interviewer}, question ${q}`}</span>
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
  const stats = computeStats(transcript, durationS);
  return (
    <div>
      <Overview feedback={feedback} stats={stats} />
      <Section title="Skill breakdown" subtitle="Judged only on what you said. Language, accent and grammar are never scored.">
        <Skills scores={feedback.scores} />
      </Section>
      <Section title="Your interview in numbers">
        <Stats stats={stats} />
      </Section>
      <Section title="In your own words" subtitle="Every quote below matches your transcript word for word.">
        <Highlights feedback={feedback} />
        {feedback.quotes_removed > 0 && (
          <p className="mt-3 text-sm text-muted">
            {feedback.quotes_removed} paraphrased {feedback.quotes_removed === 1 ? "quote was" : "quotes were"} removed because {feedback.quotes_removed === 1 ? "it" : "they"} didn&apos;t match your exact words.
          </p>
        )}
      </Section>
      {feedback.examples?.length > 0 && (
        <Section title="Even better answers" subtitle="Your answer next to a stronger version you could try.">
          <BetterAnswers examples={feedback.examples} />
        </Section>
      )}
      <div className="mt-12 card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 bg-cream">
        <div>
          <h3 className="display display-tight text-2xl text-accent">Ready for another round?</h3>
          <p className="mt-1 text-ink-2">Practise the same role again and see the score move.</p>
        </div>
        <a href="/practice" className="btn btn-accent">Practise again <ArrowUpRight size={17} /></a>
      </div>
    </div>
  );
}
