"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Clock, Hourglass, Languages, Lock, MicVocal } from "lucide-react";
import { api, clearGuestToken, getGuestToken } from "@/lib/api";
import Report, { Conversation } from "@/components/report/Report";
import { fmtDuration } from "@/lib/reportStats";
import Tabs from "@/components/ui/Tabs";

const TYPE = { technical: "Technical", hr: "HR", mixed: "Mixed" };
const LANG = { en: "English", hi: "Hindi", hinglish: "Hinglish" };

export default function ResultsPage({ params }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-24 text-muted">Loading…</div>}>
      <ResultsView id={id} />
    </Suspense>
  );
}

function ResultsView({ id }) {
  const search = useSearchParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("feedback");
  const [signedIn, setSignedIn] = useState(null);
  const [claimMsg, setClaimMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api(`interviews/${id}`, { guestToken: getGuestToken(id) });
      setDoc(d);
      return d;
    } catch (e) {
      setError(e.status === 404 ? "This interview doesn't exist or isn't yours." : e.message);
      return null;
    }
  }, [id]);

  const claim = useCallback(async () => {
    const token = getGuestToken(id);
    if (!token) return;
    try {
      await api(`interviews/${id}/claim`, { method: "POST", body: { guest_token: token } });
      clearGuestToken(id);
      setClaimMsg("Saved to your account.");
      load();
    } catch (e) {
      setClaimMsg(e.message);
    }
  }, [id, load]);

  useEffect(() => {
    let timer;
    let tries = 0;
    const poll = async () => {
      const d = await load();
      if (d && ["created", "in_progress"].includes(d.status) && tries++ < 40) timer = setTimeout(poll, 3000);
    };
    poll();
    api("me").then(() => setSignedIn(true)).catch(() => setSignedIn(false));
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    // Returning from sign-in with ?claim=1: save the guest interview to the account once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (signedIn && doc?.claimable && search.get("claim") === "1") claim();
  }, [signedIn, doc?.claimable, search, claim]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="display text-3xl">Not found</h1>
        <p className="mt-3 text-ink-2">{error}</p>
        <Link href="/" className="btn btn-primary mt-8">Home</Link>
      </div>
    );
  }
  if (!doc) return <div className="mx-auto max-w-5xl px-4 py-24 text-muted">Loading…</div>;

  const pending = ["created", "in_progress"].includes(doc.status);
  const fb = doc.feedback;
  const hasReport = !pending && !doc.feedback_held && doc.status !== "abandoned" && fb && !fb.error && !fb.insufficient;
  const meta = [
    { icon: CalendarDays, text: new Date(doc.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) },
    { icon: Clock, text: doc.duration_s ? fmtDuration(doc.duration_s) : null },
    { icon: Languages, text: `Interviewer spoke ${LANG[doc.spec?.language] || ""}` },
    { icon: MicVocal, text: doc.voice ? `With ${doc.voice}` : null },
  ].filter((m) => m.text);

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
        <div className="relative overflow-hidden rounded-[1.75rem] card !border-white">
          <Image src="/images/sunset.webp" alt="" fill priority sizes="100vw" className="object-cover object-[50%_35%]" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,243,0.96)_0%,rgba(255,250,243,0.86)_50%,rgba(255,250,243,0.35)_100%)]" />
          <div className="relative px-6 sm:px-10 py-9 sm:py-11 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap gap-2">
                <span className="chip">{doc.kind === "scheduled" ? "Scheduled interview" : "Practice interview"}</span>
                <span className="chip">{TYPE[doc.spec?.interview_type]}</span>
              </div>
              <h1 className="display display-tight text-4xl sm:text-5xl text-accent mt-3">{doc.spec?.role}</h1>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-ink-2">
                {meta.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-1.5"><Icon size={16} aria-hidden className="text-muted" />{text}</li>
                ))}
              </ul>
            </div>
            {doc.claimable ? (
              <div className="rounded-2xl bg-white/90 backdrop-blur border border-white p-4 max-w-xs shadow-sm">
                <p className="text-sm text-ink-2">Guest results are kept for 48 hours. Sign in to keep this interview.</p>
                {signedIn ? (
                  <button className="btn btn-accent mt-3 !py-2" onClick={claim}>Save to my account</button>
                ) : (
                  <a className="btn btn-accent mt-3 !py-2"
                    href={`/auth/login?connection=google-oauth2&returnTo=${encodeURIComponent(`/results/${id}?claim=1`)}`}>
                    Sign in with Google to save
                  </a>
                )}
                {claimMsg && <p className="text-sm mt-2">{claimMsg}</p>}
              </div>
            ) : claimMsg ? (
              <p className="text-sm text-sage font-medium">{claimMsg}</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-6">
        <Tabs className="mt-8" value={tab} onChange={setTab} tabs={[["feedback", "Report"], ["transcript", "Conversation"]]} />
        <div className="mt-6">
          {tab === "feedback" ? (
            hasReport ? (
              <Report feedback={fb} transcript={doc.transcript} durationS={doc.duration_s} />
            ) : (
              <StateCard doc={doc} pending={pending} />
            )
          ) : (
            <div className="card p-5 sm:p-8">
              <Conversation turns={doc.transcript} interviewer={doc.voice || "Interviewer"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StateCard({ doc, pending }) {
  const fb = doc.feedback;
  const [Icon, title, body] = pending
    ? [Hourglass, "Writing your feedback", "This usually takes a few seconds. The page refreshes on its own."]
    : doc.feedback_held
      ? [Lock, "Results not released yet", "The recruiter will share your results when they're ready. You can read your conversation in the meantime."]
      : doc.status === "abandoned"
        ? [Hourglass, "No answers recorded", "The interview ended before you answered, so there's nothing to score."]
        : fb?.insufficient
          ? [Hourglass, "Not enough to assess", fb.summary]
          : [Hourglass, "Feedback couldn't be written", fb?.error || "Something went wrong while writing feedback."];
  return (
    <div className="card p-8 sm:p-10 text-center max-w-xl mx-auto">
      <span className={`mx-auto h-12 w-12 rounded-2xl grid place-items-center ${pending ? "bg-haldi-soft text-haldi" : "bg-violet-soft text-violet"}`}>
        <Icon size={22} className={pending ? "animate-pulse" : ""} aria-hidden />
      </span>
      <h2 className="display display-tight text-2xl text-accent mt-4">{title}</h2>
      <p className="mt-2 text-ink-2">{body}</p>
      {!pending && <a href="/practice" className="btn btn-outline mt-6">Start a new interview</a>}
    </div>
  );
}
