"use client";

import useReducedMotionSafe from "@/lib/useReducedMotionSafe";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { BarChart3, Mic, MousePointerClick } from "lucide-react";
import { ChooseScreen, FeedbackScreen, SpeakScreen } from "./MockScreens";

const STEPS = [
  { icon: MousePointerClick, title: "Choose your interview", body: "Pick a role and how hard it should be, from DSA and development to HR and behavioural rounds.", Screen: ChooseScreen },
  { icon: Mic, title: "Speak your answer", body: "Have a natural voice conversation in Hindi, English or Hinglish. It follows up when an answer is vague.", Screen: SpeakScreen },
  { icon: BarChart3, title: "Get instant feedback", body: "A score, a breakdown across key skills, and quotes from your own answers showing what to improve.", Screen: FeedbackScreen },
];

function StepItem({ step, i, active, onClick }) {
  const Icon = step.icon;
  return (
    <button onClick={onClick} className={`w-full text-left flex gap-4 rounded-3xl p-4 sm:p-5 transition-all duration-300 ${active ? "bg-white shadow-[0_20px_50px_-30px_rgba(74,26,20,0.35)] border border-line" : "opacity-60 hover:opacity-90"}`}>
      <span className={`relative h-12 w-12 shrink-0 rounded-2xl grid place-items-center transition-colors ${active ? "bg-violet text-white" : "bg-violet-soft text-violet"}`}>
        <Icon size={22} />
        <span className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-white border border-line text-xs font-semibold text-violet grid place-items-center">{i + 1}</span>
      </span>
      <span>
        <span className="display block text-xl sm:text-[1.35rem] text-accent" style={{ fontWeight: 600 }}>{step.title}</span>
        <span className="mt-1 block text-ink-2 leading-relaxed">{step.body}</span>
      </span>
    </button>
  );
}

export default function HowItWorks() {
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(2, Math.floor(v * 3))));

  const jump = (i) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / 3), behavior: reduce ? "auto" : "smooth" });
  };
  const Screen = STEPS[active].Screen;

  return (
    <section id="how" className="wash scroll-mt-20">
      {/* Desktop: pinned while the three steps scroll by */}
      <div ref={ref} className="hidden lg:block relative h-[300vh]">
        <div className="sticky top-0 h-screen flex items-center">
          <div className="mx-auto max-w-7xl w-full px-8 grid grid-cols-[1fr_1.15fr] gap-14 items-center">
            <div>
              <h2 className="display display-tight text-5xl text-accent">How Rapport works</h2>
              <p className="mt-4 text-lg text-ink-2 max-w-md">A simple, voice-first practice flow. Real questions, real conversation, instant feedback.</p>
              <div className="mt-8 space-y-3">
                {STEPS.map((s, i) => <StepItem key={s.title} step={s} i={i} active={i === active} onClick={() => jump(i)} />)}
              </div>
              <div className="mt-6 ml-5 h-1 w-40 rounded-full bg-paper-2 overflow-hidden">
                <motion.div className="h-full bg-haldi origin-left" style={{ scaleX: scrollYProgress }} />
              </div>
            </div>
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div key={active}
                  initial={reduce ? false : { opacity: 0, y: 30, rotate: 0.6 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={reduce ? {} : { opacity: 0, y: -20 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                  <Screen />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile and tablet: a simple stack */}
      <div className="lg:hidden mx-auto max-w-2xl px-5 py-20">
        <h2 className="display display-tight text-4xl text-accent">How Rapport works</h2>
        <p className="mt-3 text-lg text-ink-2">Real questions, real conversation, instant feedback.</p>
        <div className="mt-8 space-y-3">
          {STEPS.map((s, i) => <StepItem key={s.title} step={s} i={i} active onClick={() => {}} />)}
        </div>
        <div className="mt-10"><SpeakScreen /></div>
      </div>
    </section>
  );
}
