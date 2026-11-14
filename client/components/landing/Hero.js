"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mic } from "lucide-react";

// The product's whole idea, said three ways. The full line changes, not one word.
const LINES = [
  { lang: "en", text: "Answer in the language you think in." },
  { lang: "hi", text: "जिस भाषा में सोचते हैं, उसी में जवाब दीजिए।" },
  { lang: "hinglish", text: "Jis language mein sochte ho, usi mein bolo." },
];

const ANSWER = "Database पर load बहुत ज़्यादा था, तो हमने Redis cache लगाया और p99 latency अस्सी milliseconds पर आ गई।".split(" ");

export default function Hero() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [words, setWords] = useState(reduce ? ANSWER.length : 0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 4200);
    return () => clearInterval(t);
  }, [reduce]);

  useEffect(() => {
    if (reduce) return;
    let n = 0;
    const t = setInterval(() => {
      n = n >= ANSWER.length + 8 ? 0 : n + 1; // pause on the full line, then start over
      setWords(Math.min(n, ANSWER.length));
    }, 260);
    return () => clearInterval(t);
  }, [reduce]);

  const line = LINES[i];
  return (
    <section className="relative min-h-[100svh] flex items-end md:items-center overflow-hidden bg-night">
      <Image
        src="/images/hero.jpg"
        alt="A candidate explaining her answer across the table in a bright office"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[30%_center]"
      />
      <div className="absolute inset-0 veil-right" aria-hidden />

      <div className="relative w-full mx-auto max-w-7xl px-4 sm:px-6 pt-28 pb-14 md:py-0 grid md:grid-cols-2">
        <div className="md:col-start-2 text-white">
          <p className="text-white/80 text-lg">A voice interviewer for Hindi, English and Hinglish</p>
          <h1 className="display mt-4 text-[2.6rem] sm:text-6xl lg:text-[4.4rem] min-h-[2.3em] sm:min-h-[2.2em]" lang={line.lang === "hi" ? "hi" : "en"}>
            <AnimatePresence mode="wait">
              <motion.span
                key={line.lang}
                className="block"
                initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                {line.text}
              </motion.span>
            </AnimatePresence>
          </h1>
          <p className="mt-5 max-w-lg text-lg sm:text-xl text-white/85 leading-relaxed">
            Rapport asks real follow-up questions and judges what you say, not how English it sounds. Practise for your
            next role, or screen candidates in the language they&apos;re best in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/practice" className="btn btn-accent text-lg !px-6 !py-3.5">
              Start a practice interview
            </Link>
            <a href="/auth/login?connection=google-oauth2&returnTo=/recruiter" className="btn btn-glass text-lg !px-6 !py-3.5">
              Screen candidates
            </a>
          </div>

          <div className="mt-10 max-w-lg rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-4 sm:p-5" aria-hidden>
            <div className="flex items-center gap-2 text-sm text-white/75">
              <span className="relative grid place-items-center h-6 w-6 rounded-full bg-sage">
                <Mic size={13} />
                {!reduce && <span className="absolute inset-0 rounded-full bg-sage animate-ping opacity-40" />}
              </span>
              Candidate, transcribed live
            </div>
            <p className="mt-3 text-[1.05rem] leading-relaxed text-white min-h-[3.2em]" lang="hi">
              {ANSWER.slice(0, words).join(" ")}
              {words < ANSWER.length && <span className="inline-block w-0.5 h-5 align-[-3px] ml-1 bg-haldi animate-pulse" />}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
