import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList } from "lucide-react";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Faq from "@/components/landing/Faq";
import Reveal from "@/components/landing/Reveal";
import { MiniRing } from "@/components/landing/MockScreens";
import SmoothScroll from "@/components/SmoothScroll";

const SCORES = [
  ["Clarity", 4, "var(--sage)"],
  ["Specificity", 4, "var(--violet)"],
  ["Confidence", 3, "#6aa0e8"],
  ["Structure", 3, "var(--violet)"],
];

export default function Home() {
  return (
    <SmoothScroll>
      <Hero />
      <HowItWorks />

      {/* Feedback, over the sunset */}
      <section id="feedback" className="relative overflow-hidden scroll-mt-20">
        <Image src="/images/sunset.webp" alt="" fill sizes="100vw" className="object-cover object-[30%_70%]" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,var(--paper)_0%,rgba(244,242,250,0)_18%,rgba(244,242,250,0)_82%,var(--paper)_100%)]" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-28 lg:py-36 grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
          <div className="max-w-lg">
            <h2 className="display display-tight text-4xl sm:text-[3.3rem] text-accent">Detailed feedback to help you improve.</h2>
            <p className="mt-5 text-lg text-accent/80 leading-relaxed">
              An overall score, a breakdown across key skills, and suggestions after every interview. Every quote is
              checked word for word against what you said.
            </p>
          </div>
          <Reveal>
            <div className="card card-cream p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-haldi-soft text-haldi grid place-items-center"><ClipboardList size={18} /></span>
                  <span className="text-lg font-medium text-ink">Your interview scorecard</span>
                </div>
                <span className="chip !bg-violet-soft !border-transparent !text-violet">SDE interview, Hinglish</span>
              </div>
              <div className="mt-7 flex flex-col sm:flex-row gap-8 sm:items-center">
                <MiniRing value={7} size={140} />
                <div className="flex-1 space-y-4">
                  {SCORES.map(([k, v, c]) => (
                    <div key={k}>
                      <div className="flex justify-between"><span className="font-medium text-ink">{k}</span><span className="text-muted">{v}/5</span></div>
                      <div className="mt-1.5 h-2.5 rounded-full bg-paper-2"><div className="h-full rounded-full" style={{ width: `${v * 20}%`, background: c }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-7 rounded-2xl bg-sage-soft p-4 flex gap-3">
                <BadgeCheck size={21} className="text-sage shrink-0 mt-0.5" />
                <p className="text-ink">
                  You explained the approach clearly and backed it with a number:{" "}
                  <span className="italic text-ink-2" lang="hi">“p99 latency अस्सी milliseconds पर आ गई”</span>. Next time, cover the edge cases too.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Two doors */}
      <section id="teams" className="mx-auto max-w-7xl px-5 sm:px-8 py-24 grid md:grid-cols-2 gap-6 scroll-mt-24">
        <Door href="/practice" image="/images/candidate.webp" alt="A young man smiling as he practises at his laptop by a sunny window"
          title={<>Practise for your next interview.</>}
          body="Build confidence with realistic, voice-based interviews for roles in tech, product, sales and more."
          cta="Start practising" />
        <Door href="/auth/login?connection=google-oauth2&returnTo=/recruiter" external image="/images/recruiter.webp"
          alt="A recruiter smiling at her laptop at a sunlit desk"
          title={<>Screen candidates in their language.</>}
          body="Run voice interviews at scale in Hindi, English and Hinglish for a fairer, more inclusive first round."
          cta="For recruiters" />
      </section>

      <Faq />
    </SmoothScroll>
  );
}

function Door({ href, image, alt, title, body, cta, external }) {
  const inner = (
    <>
      <Image src={image} alt={alt} fill sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover object-right transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(255,248,240,0.86),rgba(255,248,240,0.86))] sm:bg-[linear-gradient(90deg,rgba(255,248,240,0.96)_0%,rgba(255,248,240,0.88)_34%,rgba(255,248,240,0)_52%)]" />
      <div className="relative h-full flex flex-col justify-between p-7 sm:p-9 sm:max-w-[58%] lg:max-w-[52%]">
        <div>
          <h3 className="display display-tight text-3xl sm:text-[2.3rem] text-accent">{title}</h3>
          <p className="mt-4 text-ink-2 leading-relaxed">{body}</p>
        </div>
        <span className="btn btn-outline self-start mt-6">{cta} <ArrowRight size={17} /></span>
      </div>
    </>
  );
  const cls = "group relative block min-h-[22rem] sm:min-h-[26rem] rounded-[1.75rem] overflow-hidden card !border-white";
  return external ? <a href={href} className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>;
}
