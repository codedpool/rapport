"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import LaunchPanel from "@/components/LaunchPanel";

const TYPE = { technical: "Technical", hr: "HR", mixed: "Mixed" };
const LANG = { en: "English", hi: "Hindi", hinglish: "Hinglish" };

export default function StartScheduled({ assignmentId }) {
  const [a, setA] = useState(undefined);
  useEffect(() => {
    api("my-assignments")
      .then((d) => setA(d.assignments.find((x) => x.id === assignmentId) || null))
      .catch(() => setA(null));
  }, [assignmentId]);

  if (a === undefined) return <div className="mx-auto max-w-5xl px-4 py-24 text-muted">Loading…</div>;
  if (!a || a.status !== "pending") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="display text-3xl">Interview unavailable</h1>
        <p className="mt-3 text-ink-2">It may be finished already, or it was sent to a different email address.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 grid lg:grid-cols-[1fr_1.3fr] gap-6 items-start">
      <section>
        <span className="chip">Scheduled interview</span>
        <h1 className="display text-4xl mt-3">{a.role}</h1>
        <p className="mt-2 text-ink-2">{a.template_name}</p>
        <ul className="mt-6 space-y-2 text-ink-2">
          <li>{TYPE[a.interview_type]} interview, about {a.duration_min} minutes</li>
          <li>The interviewer speaks {LANG[a.language]}; answer in Hindi, English or any mix</li>
          <li>Find a quiet spot. Headphones help.</li>
          <li>You get one attempt. Results are shared when the recruiter releases them.</li>
        </ul>
      </section>
      <section className="card p-6 sm:p-8">
        <LaunchPanel mode="scheduled" assignmentId={a.id} />
      </section>
    </div>
  );
}
