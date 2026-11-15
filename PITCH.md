# Rapport

### Language is a bridge, not the measure of knowledge.

**Live app:** https://rapport-tawny.vercel.app · **Demo (2:50):** _link_ · **Code:** https://github.com/codedpool/rapport

## The problem

AI interviews have quietly become the first round for millions of job seekers. They are fast and they scale, but they do not listen the way a person does. They transcribe English, score fluency, and treat accent as if it were competence.

A good human interviewer does the opposite. They follow the thought, ask what you meant, and decide whether you understand the work. The language is only how the idea travels.

In India that difference decides careers. English is our bridge to the world, and we need it. But only about one in ten Indians speaks it (Census 2011). Most of us reason best in Hindi, or in the Hinglish we use at work. When an interview grades the bridge instead of what crosses it, capable people fail rounds they should pass, and our own languages lose standing as languages of serious work. The belief that intelligence must arrive in English is a habit we inherited, not a truth.

And it is not only about language. A flat, robotic interviewer tells a candidate they did not even deserve a person's attention. That feeling of being neglected costs confidence before the first answer is given.

## One platform for hiring and AI interviews

Rapport is a one-stop platform for running interviews and hiring. Candidates come in two ways:

- **They practise with a mock interview** for any role, any time.
- **They take an interview set up by a hiring team**, which appears on their dashboard.

Hiring teams run the whole first round for a large pool of candidates. They build an interview once with their own questions and invite candidates by email in bulk. Then they review every candidate's scores and transcript in one place to shortlist, and release results when they're ready. Every candidate gets the same questions, in the language they're comfortable in.

## What the interviewer does

- **It feels human.** Gnani's voice stack gives it a warm voice with natural pauses and real-time turn-taking. You can interrupt it, and it nudges you when you're stuck. Candidates feel heard, not processed.
- **It asks about what you built.** It reads your resume in the browser, with contact details removed. Then it asks about your real projects and results, and follows up when an answer is vague.
- **It judges clarity, not language.** Answer in Hindi, English or Hinglish, and switch its language mid-interview. The interviewer is told never to penalise accent, grammar or code-mixing. The same answers in all three languages score **8.0 / 8.0 / 8.0**.
- **It coaches, not just scores.** You get scores for clarity, specificity, confidence and structure, and the one thing to fix first. Your weakest answers are rewritten from your own words, and every quote is checked against the transcript.

## Why it feels human: built on Gnani

- **Prisma v3.0 realtime STT** with code-mix output keeps English terms in Latin script and Hindi in Devanagari, exactly as Indians speak.
- **Timbre v3.0 expressive TTS** gives the interviewer natural pauses and breath, so it sounds like a person, not a phone menu.
- **Natural turn-taking** uses Pipecat with voice activity detection and smart-turn detection. On Groq, the first reply comes in about 1.2 s, with about 1.7 s between turns. A three-model fallback means token limits never cut an interview short.

## Try it yourself: bring your own key

Rapport is deliberately **BYOK (bring your own key)**, so anyone can try the full product today, not just watch a demo.

- Get a Gnani key at **app.gnani.ai/voice**. Students registered for Gnani's Great Indian AI Internship Challenge get **5,000 free API credits**.
- Get a free Groq key at **console.groq.com**.
- Paste both in and start interviewing.

Your keys are held in memory only for that interview and are never stored. No audio is kept, every record is owner-scoped, and one click deletes everything.

## Who it serves

Students in tier-2 and tier-3 colleges, job seekers outside English-first metros, and hiring teams running high-volume first rounds across India.

With Rapport, the interview measures the engineer, the analyst and the salesperson, not their second language. Every candidate gets the feeling of being truly heard. Hindi and Hinglish become languages you can be assessed in, not ones you apologise for.

**Stack:** Next.js, FastAPI, Pipecat, Gnani Prisma and Timbre, Groq / OpenRouter / Gemini, MongoDB, Auth0.
