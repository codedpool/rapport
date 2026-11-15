# Rapport

### Language is a bridge, not the measure of knowledge.

**Live app:** https://rapport-tawny.vercel.app · **Demo (2:50):** _link_ · **Code:** https://github.com/codedpool/rapport

## The problem

AI interviews have quietly become the first round for millions of job seekers. They are fast and they scale, but they do not listen the way a person does. They transcribe English, score fluency, and treat accent as if it were competence.

A good human interviewer does the opposite. They follow the thought, ask what you meant, and decide whether you understand the work. The language is only how the idea travels.

In India that difference decides careers. English is our bridge to the world, and we need it. But only about one in ten Indians speaks it (Census 2011). Most of us reason and explain best in Hindi, or in the Hinglish we actually use at work. When an interview grades the bridge instead of what crosses it, capable engineers, analysts and salespeople fail rounds they should pass. Our own languages slowly lose standing as languages of serious work. The belief that intelligence must arrive in English is a habit we inherited, not a truth. Valuing English should never mean devaluing everything else.

## What Rapport does

Rapport is a real-time voice interviewer that holds a natural conversation in **Hindi, English or Hinglish**. It judges what you say, not how English it sounds.

- **It listens like a person.** It asks follow-ups on vague answers. When you're stuck, it nudges you with your own resume. You can interrupt it, and switch its language mid-interview.
- **It knows you.** It reads your resume in the browser, with contact details removed, and asks about your real projects and results.
- **It is fair, by design and by measurement.** The interviewer is told never to penalise accent, grammar or code-mixing. The same answers given in English, Hindi and Hinglish score **8.0 / 8.0 / 8.0**.
- **It coaches, not just scores.** You get scores for clarity, specificity, confidence and structure, and the one thing to fix first. Your weakest answers are rewritten from your own words, and every quote is checked against the transcript.
- **It works for recruiters.** Every candidate is asked the same questions, in the language they're comfortable in. Recruiters invite candidates by email in bulk and release results when they're ready.

## Why it feels human: built on Gnani

- **Prisma v3.0 realtime STT** with code-mix output keeps English terms in Latin script and Hindi in Devanagari, exactly as Indians speak.
- **Timbre v3.0 expressive TTS** gives the interviewer natural pauses and breath, so it sounds like a person rather than a phone menu.
- **Natural turn-taking** comes from Pipecat with voice activity detection and smart-turn detection. On Groq, the first reply comes in about 1.2 s and there are about 1.7 s between turns. A three-model fallback stops token limits from cutting an interview short, and a silent interviewer turn is retried automatically.

## Trust

- You bring your own keys. They are held in memory only and scrubbed from logs.
- No audio is stored.
- Every route checks who owns the data.
- One click deletes everything.

## Who it serves

- Students in tier-2 and tier-3 colleges preparing for placements.
- Job seekers outside English-first metros.
- Recruiters running high-volume first rounds across India.

With Rapport, the interview measures the engineer, the analyst and the salesperson, not their second language. Hindi and Hinglish become languages you can be assessed in, not ones you apologise for.

**Stack:** Next.js, FastAPI, Pipecat, Gnani Prisma and Timbre, Groq / OpenRouter / Gemini, MongoDB, Auth0.
