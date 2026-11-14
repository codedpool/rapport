"use client";

import { useState } from "react";
import SpecFields, { EMPTY_SPEC } from "@/components/SpecFields";
import LaunchPanel from "@/components/LaunchPanel";

export default function PracticePage() {
  const [spec, setSpec] = useState(EMPTY_SPEC);
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="display text-4xl sm:text-5xl">Practice interview</h1>
      <p className="mt-3 text-ink-2 max-w-2xl">
        Tell us the role. Rapport builds an opening set of questions from the job description and follows up live.
      </p>
      <div className="mt-8 grid lg:grid-cols-2 gap-6 items-start">
        <section className="card p-6 sm:p-8">
          <h2 className="font-semibold mb-5">The interview</h2>
          <SpecFields spec={spec} onChange={setSpec} />
        </section>
        <section className="card p-6 sm:p-8">
          <LaunchPanel mode="mock" spec={spec}
            validate={() => (spec.role.trim().length < 2 ? "Add the role you're interviewing for." : null)} />
        </section>
      </div>
    </div>
  );
}
