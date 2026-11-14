"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const STATUS = {
  pending: { label: "To do", cls: "bg-accent-soft text-accent-ink" },
  in_progress: { label: "In progress", cls: "bg-paper-2 text-ink-2" },
  completed: { label: "Completed", cls: "bg-sage-soft text-sage" },
};
const LANG = { en: "English", hi: "Hindi", hinglish: "Hinglish" };

export default function CandidateDashboard({ name, email }) {
  const [tab, setTab] = useState("scheduled");
  const [assignments, setAssignments] = useState(null);
  const [unverified, setUnverified] = useState(false);
  const [interviews, setInterviews] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("my-assignments").then((d) => { setAssignments(d.assignments); setUnverified(!!d.email_unverified); }).catch((e) => setError(e.message));
    api("interviews").then((d) => setInterviews(d.interviews)).catch((e) => setError(e.message));
  }, []);

  const mocks = (interviews || []).filter((i) => i.kind === "mock");
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="display text-4xl sm:text-5xl">{name ? `Hi ${name.split(" ")[0]}` : "Your interviews"}</h1>
      <p className="mt-2 text-ink-2">Scheduled interviews sent to {email} appear here, along with your practice history.</p>

      <div className="seg mt-8" role="tablist">
        {[["scheduled", "Scheduled"], ["practice", "Practice"], ["results", "All results"]].map(([k, l]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {error && <p className="mt-4 text-danger text-sm">{error}</p>}

      {tab === "scheduled" && (
        <div className="mt-6 grid gap-4">
          {unverified && <div className="card p-5 text-ink-2">Verify your email address to see interviews sent to you.</div>}
          {assignments === null && <p className="text-muted">Loading…</p>}
          {assignments?.length === 0 && (
            <div className="card p-8 text-ink-2">
              No scheduled interviews yet. When a recruiter invites {email}, it shows up here.
              <div className="mt-4"><Link className="btn btn-primary" href="/practice">Practice meanwhile</Link></div>
            </div>
          )}
          {assignments?.map((a) => (
            <div key={a.id} className="card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`chip !border-transparent ${STATUS[a.status]?.cls}`}>{STATUS[a.status]?.label}</span>
                  <span className="text-sm text-muted">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-2 text-lg font-semibold">{a.role || a.template_name}</div>
                <div className="text-sm text-muted">
                  {a.template_name} · {a.duration_min} min · {LANG[a.language] || ""}
                </div>
              </div>
              {a.status === "completed" ? (
                a.interview_id && (
                  <Link className="btn btn-ghost" href={`/results/${a.interview_id}`}>
                    {a.released ? "View feedback" : "View transcript"}
                  </Link>
                )
              ) : a.status === "pending" ? (
                <Link className="btn btn-accent" href={`/interview/start?assignment=${a.id}`}>Start interview</Link>
              ) : (
                <span className="text-sm text-muted">In progress</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "practice" && (
        <div className="mt-6 grid gap-4">
          <Link href="/practice" className="card p-6 hover:border-ink-2 flex items-center justify-between">
            <span>
              <span className="font-semibold">New practice interview</span>
              <span className="block text-sm text-muted">Any role, any job description, as many times as you like.</span>
            </span>
            <span className="btn btn-accent">Start</span>
          </Link>
          <ResultList items={mocks} empty="No practice interviews yet." />
        </div>
      )}

      {tab === "results" && <div className="mt-6"><ResultList items={interviews || []} empty="No interviews yet." /></div>}
    </div>
  );
}

function ResultList({ items, empty }) {
  if (!items.length) return <p className="text-muted">{empty}</p>;
  return (
    <div className="card divide-y divide-line">
      {items.map((i) => (
        <Link key={i.id} href={`/results/${i.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-paper">
          <span>
            <span className="font-medium">{i.spec?.role}</span>
            <span className="block text-sm text-muted">
              {i.kind === "scheduled" ? "Scheduled" : "Practice"} · {new Date(i.created_at).toLocaleString()}
            </span>
          </span>
          <span className="text-right">
            {i.feedback_held ? (
              <span className="chip">Awaiting release</span>
            ) : i.feedback?.overall ? (
              <span className="display text-2xl">{i.feedback.overall}<span className="text-sm text-muted">/10</span></span>
            ) : (
              <span className="chip">{i.status === "completed" ? "No score" : i.status}</span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
