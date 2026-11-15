# Rapport: voice interviews in the language you think in

**Live app:** _link added at deploy_ · **Demo video:** _link_ · **Code:** https://github.com/codedpool/rapport

## The problem

Most Indian candidates think in two languages. Campus placements, BPO hiring and first-round screens still run in formal English, and AI interviewers make it worse: they only listen in English, and their scores quietly reward accent and fluency over substance. Good candidates lose rounds they should have won, and recruiters screen out talent they needed.

## The solution

Rapport is a spoken AI interviewer that holds a natural, real-time conversation in **Hindi, English or Hinglish**, and judges what you say, not how English it sounds.

- **For candidates:** unlimited practice interviews for any role. Upload a resume and the interviewer asks about your real projects and results. Deep follow-ups on vague answers, an optional pressure mode, and the freedom to switch language mid-interview.
- **For recruiters:** build an interview once with your own questions, invite candidates by email in bulk, review scored transcripts, and release results when ready. Every candidate gets the same questions in the language they're comfortable in.
- **Feedback that coaches:** scores for clarity, specificity, confidence and structure; the one thing to fix first; rewrites of your weakest answers; and every quote checked word for word against the transcript.

## Built on Gnani

- **Prisma v3.0 realtime STT** with code-mix output: English terms stay in Latin script and Hindi in Devanagari, the way people actually speak. Role keywords are passed as key terms.
- **Timbre v3.0 expressive TTS** with natural pauses and exhales, or Timbre v2.5 for steadier speed. Each interviewer turn is spoken as one request, with an idle reconnect and automatic retry so the interviewer never goes silent.
- **Pipecat pipeline** with voice activity detection and smart turn-taking. With headphones, candidates can interrupt the interviewer just like a real conversation.

## What makes it different

- **Measured fairness:** the same answers given in English, Hindi and Hinglish score **8.0 / 8.0 / 8.0**, a zero-point spread. The prompt forbids penalising accent, grammar or code-mixing.
- **Real-time:** about 1.2 s to the first reply and about 1.7 s between turns on Groq, with automatic fallback across three models so token limits never stop an interview midway.
- **Privacy by design:** bring-your-own keys, held in memory only and scrubbed from logs. No audio is stored. Resumes are read in the browser with contact details removed, and only a short reviewed summary is kept. One click deletes all your data.

## Who it's for

Students preparing for placements, job seekers outside metro English-first circles, and recruiters running high-volume first rounds across India.

**Stack:** Next.js, FastAPI, Pipecat, Gnani Prisma and Timbre, Groq / OpenRouter / Gemini, MongoDB, Auth0.
