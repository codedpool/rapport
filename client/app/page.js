import Image from "next/image";
import Link from "next/link";
import { AudioLines, BadgeCheck, KeyRound, Languages, Radio, ShieldCheck } from "lucide-react";
import Hero from "@/components/landing/Hero";
import Reveal from "@/components/landing/Reveal";
import SmoothScroll from "@/components/SmoothScroll";

const STEPS = [
  {
    title: "Tell it the role",
    body: "Paste a job description or just name the role. Rapport writes an opening set of questions for it.",
  },
  {
    title: "Talk it through",
    body: "Answer out loud in Hindi, English or both. The interviewer follows up when an answer is vague and waits while you think.",
  },
  {
    title: "Read what you said",
    body: "Scores for clarity, specificity, confidence and structure, with quotes from your own answers and a stronger version to try next time.",
  },
];

const SCORES = [
  ["Clarity", 4],
  ["Specificity", 3],
  ["Confidence", 4],
  ["Structure", 3],
];

export default function Home() {
  return (
    <SmoothScroll>
      <Hero />

      {/* A session, in order */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-24 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
        <div className="relative aspect-[4/5] lg:aspect-[4/5] rounded-[1.75rem] overflow-hidden">
          <Image src="/images/practice.jpg" alt="A candidate practising at his laptop" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
        <div>
          <h2 className="display display-tight text-4xl sm:text-5xl text-accent">Ten minutes, start to feedback</h2>
          <p className="mt-4 text-lg text-ink-2 max-w-xl">No forms, no scheduling. Open it, talk, and see exactly where your answers were strong.</p>
          <ol className="mt-10 space-y-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-4">
                <span className="display h-12 w-12 rounded-2xl bg-haldi-soft text-haldi-ink grid place-items-center text-xl">{i + 1}</span>
                <div>
                  <h3 className="text-xl font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-ink-2 leading-relaxed max-w-lg">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Feedback preview */}
      <section className="bg-white border-y border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          <div>
            <h2 className="display display-tight text-4xl sm:text-5xl text-accent">Feedback that quotes you</h2>
            <p className="mt-4 text-lg text-ink-2 max-w-lg leading-relaxed">
              Every quote in your feedback is checked word for word against the transcript. If the model paraphrases you,
              the quote is dropped instead of shown.
            </p>
            <p className="mt-4 text-lg text-ink-2 max-w-lg leading-relaxed">
              Language never costs points. The same answers in English, Hindi and Hinglish scored identically in our
              fairness check.
            </p>
          </div>
          <Reveal>
            <div className="rounded-[1.75rem] bg-paper p-3 sm:p-4 shadow-[0_40px_80px_-40px_rgba(35,42,92,0.45)]">
              <div className="rounded-[1.4rem] bg-white border border-line p-6 sm:p-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-sm text-muted">Backend Engineer, technical, Hinglish</div>
                    <p className="mt-2 text-lg text-ink leading-snug max-w-sm">
                      Strong on impact and numbers. Explain trade-offs before the result.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="display text-6xl text-accent leading-none">7</div>
                    <div className="text-sm text-muted">out of 10</div>
                  </div>
                </div>
                <div className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  {SCORES.map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-sm"><span className="font-medium">{k}</span><span className="text-muted">{v}/5</span></div>
                      <div className="mt-1 h-2 rounded-full bg-paper-2"><div className="h-full rounded-full" style={{ width: `${v * 20}%`, background: v >= 4 ? "var(--sage)" : "var(--haldi)" }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 rounded-2xl bg-sage-soft p-4">
                  <div className="text-sm font-semibold text-sage">What worked</div>
                  <p className="mt-1 text-ink">You backed the decision with a measured result.</p>
                  <blockquote className="mt-3 flex items-start gap-2 text-ink-2" lang="hi">
                    <BadgeCheck size={18} className="mt-1 shrink-0 text-sage" aria-label="Matches your words exactly" />
                    <span>“p99 latency अस्सी milliseconds पर आ गई”</span>
                  </blockquote>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Two doors */}
      <section id="teams" className="mx-auto max-w-7xl px-4 sm:px-6 py-24 scroll-mt-20">
        <h2 className="display display-tight text-4xl sm:text-5xl text-accent max-w-2xl">One interviewer, two ways in</h2>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <Door
            href="/practice"
            image="/images/conversation.jpg"
            alt="Two colleagues talking by a window"
            title="Practise for your next interview"
            body="Unlimited mock interviews from any job description. Turn on pressure mode for a harder round."
            cta="Start practising"
          />
          <Door
            href="/auth/login?connection=google-oauth2&returnTo=/recruiter"
            image="/images/team.jpg"
            alt="A recruiter and a candidate in conversation at a table"
            title="Screen candidates in their language"
            body="Build a template once, paste a list of emails, and review scored transcripts. Results stay private until you release them."
            cta="Set up screening"
            external
          />
        </div>
      </section>

      {/* Voice band */}
      <section className="relative overflow-hidden bg-night text-white">
        <Image src="/images/studio.jpg" alt="" fill sizes="100vw" className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/80 to-night/20" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-28">
          <h2 className="display display-tight text-4xl sm:text-5xl max-w-2xl">Speech that keeps up with how India talks</h2>
          <div className="mt-12 grid sm:grid-cols-3 gap-8 max-w-5xl">
            <Fact icon={<Languages size={22} />} title="Code-mixing stays intact">
              Gnani&apos;s Prisma model keeps English terms in English and Hindi in Devanagari, mid-sentence.
            </Fact>
            <Fact icon={<AudioLines size={22} />} title="A voice with breath in it">
              Timbre voices pause before the important question and never read like a script.
            </Fact>
            <Fact icon={<Radio size={22} />} title="Streaming both ways">
              Your words are transcribed as you speak and the reply is spoken as it&apos;s written, so turns feel like a conversation.
            </Fact>
          </div>
        </div>
      </section>

      {/* Keys */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-24">
        <div className="rounded-[1.75rem] bg-white border border-line p-8 sm:p-12 grid md:grid-cols-[auto_1fr_auto] gap-8 items-center">
          <span className="h-14 w-14 rounded-2xl bg-accent text-white grid place-items-center"><KeyRound size={26} /></span>
          <div>
            <h2 className="text-2xl font-semibold text-ink">Bring your own keys. They never leave memory.</h2>
            <p className="mt-2 text-ink-2 max-w-2xl leading-relaxed">
              Paste a Gnani key and an LLM key to start. They&apos;re held for one interview and dropped when it ends,
              never saved, logged or shared. Signing in saves interviews, not keys.
            </p>
          </div>
          <Link href="/privacy" className="btn btn-ghost"><ShieldCheck size={18} /> How we handle data</Link>
        </div>
      </section>
    </SmoothScroll>
  );
}

function Door({ href, image, alt, title, body, cta, external }) {
  const inner = (
    <>
      <Image src={image} alt={alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9 text-white">
        <h3 className="display display-tight text-3xl">{title}</h3>
        <p className="mt-2 text-white/85 max-w-md leading-relaxed">{body}</p>
        <span className="btn btn-accent mt-5">{cta}</span>
      </div>
    </>
  );
  const cls = "group relative block aspect-[4/5] sm:aspect-[5/4] md:aspect-[4/5] lg:aspect-[5/4] rounded-[1.75rem] overflow-hidden";
  return external ? <a href={href} className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>;
}

function Fact({ icon, title, children }) {
  return (
    <div>
      <span className="h-11 w-11 rounded-xl bg-white/10 border border-white/15 grid place-items-center text-haldi">{icon}</span>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-white/75 leading-relaxed">{children}</p>
    </div>
  );
}
