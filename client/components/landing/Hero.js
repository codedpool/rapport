"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Gentle parallax: the painting drifts slower than the page.
  const y = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 140]);
  const fade = useTransform(scrollY, [0, 500], [1, reduce ? 1 : 0.2]);

  const rise = (d) =>
    reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: d, ease: [0.22, 1, 0.36, 1] } };

  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-[#3b2a4a]">
      <motion.div className="absolute inset-0 will-change-transform" style={{ y }}>
        <Image src="/images/hero.webp" alt="A young woman with a laptop on a hillside at sunset, looking at the sky"
          fill priority sizes="100vw" className="object-cover object-[68%_center] scale-[1.08]" />
      </motion.div>
      {/* Veil: left side for the headline, bottom for the fade into the page */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(40,22,40,0.62)_0%,rgba(40,22,40,0.35)_38%,rgba(40,22,40,0)_62%)]" />
      <div aria-hidden className="md:hidden absolute inset-0 bg-[rgba(40,22,40,0.3)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />

      <motion.div style={{ opacity: fade }} className="relative h-full mx-auto max-w-7xl px-5 sm:px-8 flex items-center">
        <div className="max-w-[46rem] text-white pt-16">
          <motion.h1 {...rise(0.1)} className="display text-[2.7rem] sm:text-6xl lg:text-[4.1rem] drop-shadow-[0_2px_18px_rgba(40,20,30,0.35)]">
            Practise interviews that feel real, <em className="block">in your own language.</em>
          </motion.h1>
          <motion.p {...rise(0.3)} className="mt-6 text-lg sm:text-xl text-white/90 leading-relaxed max-w-lg">
            An AI voice interview partner for Indian job seekers. Answer in Hindi, English or Hinglish, get honest
            feedback, and walk into the real one with confidence.
          </motion.p>
          <motion.div {...rise(0.5)} className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/practice" className="btn btn-accent text-lg !px-7 !py-3.5">
              Start practising for free <ArrowRight size={19} />
            </Link>
            <a href="#how" className="btn btn-glass text-lg !px-6 !py-3.5">See how it works</a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
