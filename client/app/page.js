import Link from "next/link";

const steps = [
  {
    n: "01",
    title: "Speak the way you think",
    body: "Answer in Hindi, English or Hinglish. Switch mid-sentence if that's how you talk. Gnani's Prisma model keeps English terms in English and Hindi in Hindi.",
  },
  {
    n: "02",
    title: "A real conversation",
    body: "The interviewer listens, follows up on vague answers, and waits while you think. Short turns, natural pauses, an expressive Gnani Timbre voice.",
  },
  {
    n: "03",
    title: "Feedback with receipts",
    body: "Scores for clarity, specificity, confidence and structure, and every quote is checked word for word against what you actually said.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 grid lg:grid-cols-[1.25fr_1fr] gap-12 items-center">
        <div>
          <span className="chip mb-6">हिंदी · English · Hinglish</span>
          <h1 className="display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] font-medium">
            Interview in the language you <em className="text-accent not-italic">think</em> in.
          </h1>
          <p className="mt-6 text-lg text-ink-2 max-w-xl leading-relaxed">
            Rapport is a voice interviewer that judges what you say, not how English it sounds. Practice for your next
            role, or run first-round screens for your team.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/practice" className="btn btn-accent">
              Start a practice interview
            </Link>
            <a href="/auth/login?connection=google-oauth2&returnTo=/recruiter" className="btn btn-ghost">
              I&apos;m hiring
            </a>
            <a href="/auth/login?connection=google-oauth2&returnTo=/candidate" className="btn btn-ghost">
              I&apos;m interviewing
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">No sign-up needed to try. Bring your own Gnani and LLM keys.</p>
        </div>
        <div className="card p-6 sm:p-8 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="orb !w-14 !h-14" aria-hidden />
            <div>
              <div className="font-semibold">Shivani</div>
              <div className="text-sm text-muted">Interviewer · Backend Engineer</div>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-[0.95rem] leading-relaxed">
            <p className="text-ink-2">अच्छा, तो आपने इस project में Redis cache क्यों choose किया?</p>
            <p className="rounded-2xl bg-sage-soft px-4 py-3">
              Database पर load बहुत ज़्यादा था, तो p99 latency तीन सौ से अस्सी milliseconds पर आ गई।
            </p>
            <p className="text-ink-2">
              That&apos;s a big drop. <span className="text-muted">·</span> What did you have to give up for it?
            </p>
          </div>
          <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
            Feedback quote, verified: <span className="text-ink">“p99 latency तीन सौ से अस्सी milliseconds पर आ गई”</span>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper-2/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="display text-accent text-3xl">{s.n}</div>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-ink-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-8">
        <div className="card p-8">
          <h2 className="display text-3xl">For candidates</h2>
          <ul className="mt-4 space-y-2 text-ink-2">
            <li>Unlimited mock interviews built from any job description</li>
            <li>Pressure mode and deep follow-ups when you want a harder round</li>
            <li>Scheduled interviews from recruiters show up on your dashboard</li>
            <li>Sign in with Google to keep your history</li>
          </ul>
          <Link href="/practice" className="btn btn-primary mt-6">
            Practice now
          </Link>
        </div>
        <div className="card p-8">
          <h2 className="display text-3xl">For recruiters</h2>
          <ul className="mt-4 space-y-2 text-ink-2">
            <li>Build interview templates from your job description</li>
            <li>Paste a list of emails to invite candidates</li>
            <li>Review transcripts and scored feedback</li>
            <li>Results stay hidden from candidates until you release them</li>
          </ul>
          <a href="/auth/login?connection=google-oauth2&returnTo=/recruiter" className="btn btn-primary mt-6">
            Set up screening
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-8 text-center">
        <h2 className="display text-3xl">Your keys stay yours</h2>
        <p className="mt-3 text-ink-2 leading-relaxed">
          Your Gnani and LLM keys go to our server for the length of one interview, held in memory only, and are
          dropped when it ends. They are never written to a database, logs or error reports. Signing in saves
          interviews, never keys. <Link href="/privacy" className="underline underline-offset-4">Details</Link>.
        </p>
      </section>
    </div>
  );
}
