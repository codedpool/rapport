"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, clearGuestToken, getGuestToken } from "@/lib/api";
import Feedback, { Transcript } from "@/components/Feedback";

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
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="chip">{doc.kind === "scheduled" ? "Scheduled" : "Practice"}</span>
            <span className="chip">{TYPE[doc.spec?.interview_type]}</span>
            <span className="chip">{LANG[doc.spec?.language]}</span>
            {doc.duration_s ? <span className="chip">{Math.round(doc.duration_s / 60)} min</span> : null}
          </div>
          <h1 className="display text-4xl mt-3">{doc.spec?.role}</h1>
          <p className="text-sm text-muted mt-1">{new Date(doc.created_at).toLocaleString()}</p>
        </div>
        {doc.claimable && (
          <div className="card p-4 max-w-sm">
            <p className="text-sm text-ink-2">
              Guest results are kept for 48 hours. Sign in to keep this interview in your history.
            </p>
            {signedIn ? (
              <button className="btn btn-primary mt-3 !py-2" onClick={claim}>Save to my account</button>
            ) : (
              <a className="btn btn-primary mt-3 !py-2"
                href={`/auth/login?connection=google-oauth2&returnTo=${encodeURIComponent(`/results/${id}?claim=1`)}`}>
                Sign in with Google to save
              </a>
            )}
            {claimMsg && <p className="text-sm mt-2">{claimMsg}</p>}
          </div>
        )}
        {claimMsg && !doc.claimable && <p className="text-sm text-sage">{claimMsg}</p>}
      </div>

      <div className="seg mt-8" role="tablist">
        <button aria-pressed={tab === "feedback"} onClick={() => setTab("feedback")}>Feedback</button>
        <button aria-pressed={tab === "transcript"} onClick={() => setTab("transcript")}>Transcript</button>
      </div>

      <div className="mt-6">
        {tab === "feedback" ? (
          pending ? (
            <div className="card p-6 text-ink-2">Your feedback is being written. This page refreshes on its own.</div>
          ) : doc.feedback_held ? (
            <div className="card p-6 text-ink-2">
              The recruiter hasn&apos;t released results for this interview yet. You can read your transcript in the meantime.
            </div>
          ) : doc.status === "abandoned" ? (
            <div className="card p-6 text-ink-2">This interview ended before any answers were recorded.</div>
          ) : (
            <Feedback feedback={doc.feedback} />
          )
        ) : (
          <div className="card p-6 sm:p-8">
            <Transcript turns={doc.transcript} interviewer={doc.voice} />
          </div>
        )}
      </div>
    </div>
  );
}
