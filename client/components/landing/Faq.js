"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";

const ITEMS = [
  ["Do I have to speak in English?", "No. Answer in Hindi, English or any mix, and switch whenever you like. The interviewer can speak any of the three, and your language never affects your score: the same answers in English, Hindi and Hinglish scored identically in our fairness check."],
  ["What does it cost?", "Rapport is free. You bring your own Gnani key for the voice and an LLM key (OpenRouter or Gemini) for the questions and feedback, so you only pay those providers for what you use."],
  ["What happens to my keys?", "They're held in the server's memory for one interview and dropped when it ends. They're never saved, logged or shared, and signing in saves your interviews, not your keys."],
  ["Is my interview recorded?", "Your voice is transcribed live and the audio is not stored. Rapport keeps the transcript and feedback so you can review them, and your camera preview never leaves your device."],
  ["How is the feedback scored?", "On clarity, specificity, confidence and structure, judged only on what you said. Every quote in your feedback is checked word for word against your transcript."],
  ["Can my company use it to screen candidates?", "Yes. Recruiters build a template from a job description, invite candidates by email, and review scored transcripts. Candidates only see their results once you release them."],
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faqs" className="mx-auto max-w-3xl px-5 sm:px-8 py-24 scroll-mt-24">
      <h2 className="display display-tight text-4xl sm:text-5xl text-accent text-center">Questions, answered</h2>
      <div className="mt-10 space-y-3">
        {ITEMS.map(([q, a], i) => {
          const on = open === i;
          return (
            <div key={q} className={`rounded-3xl border transition-colors ${on ? "bg-white border-line shadow-[0_20px_50px_-35px_rgba(74,26,20,0.35)]" : "bg-white/60 border-transparent"}`}>
              <button className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left" aria-expanded={on} onClick={() => setOpen(on ? -1 : i)}>
                <span className="text-lg font-medium text-ink">{q}</span>
                <motion.span animate={{ rotate: on ? 45 : 0 }} className={`h-8 w-8 shrink-0 rounded-full grid place-items-center ${on ? "bg-haldi text-white" : "bg-haldi-soft text-haldi-ink"}`}>
                  <Plus size={17} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden">
                    <p className="px-6 pb-6 text-ink-2 leading-relaxed max-w-2xl">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
