# Rapport

A multilingual voice interview platform. Have a spoken interview in Hindi, English or Hinglish, get relevant follow-up questions, and receive feedback that quotes what you actually said.

The idea in one line: you stay in the language you think in, and the interview judges what you say, not how English it sounds.

Built for the Gnani AI Voice AI Challenge.

## What it does

**Candidates**
- Practice interviews built from any role and job description, as many as you like
- Technical, HR or mixed interviews, 5, 8 or 12 minutes
- Deep follow-ups (at most two in a row) and an optional pressure mode
- Answer in Hindi, English or any mix; switch the interviewer's language mid-interview
- Scheduled interviews from recruiters appear on your dashboard (matched by verified Google email)
- Feedback: clarity, specificity, confidence and structure scores, strengths, things to sharpen, and rewritten "even better" answers. Every quote is checked word for word against the transcript.
- Turn-by-turn transcript; guest results can be saved to an account after signing in

**Recruiters**
- Interview templates: role, job description, resume highlights, type, length, language, pressure mode, follow-ups, key terms
- Invite candidates by pasting a list of emails
- Track status, review transcripts and scores
- Results stay hidden from candidates until you release them

## How it works

```
Browser (Next.js)
  ├─ pages, Auth0 session ──► Next.js server ──► /api/backend/* bridge ──► Python API (FastAPI)
  └─ mic PCM 16 kHz ◄──── websocket ────► Python API: Pipecat pipeline
                                              Gnani Prisma v3.0 STT (realtime)
                                              → user turn (Silero VAD + smart-turn)
                                              → LLM (OpenRouter or Gemini, streaming)
                                              → Gnani Timbre TTS (realtime) ──► PCM 24 kHz back
                                          MongoDB: interviews, templates, invites (never keys)
```

- **Speech in:** Gnani Prisma v3.0 over websocket, `codemix` output so English terms stay in Latin script and Hindi in Devanagari. Role key terms are passed as `keyterms`. Idle timeout raised so a thinking candidate isn't cut off.
- **Speech out:** Gnani Timbre v3.0 (expressive, with `<pauses>` and `<exhales>` only) or Timbre v2.5 (fast, steadier first-audio time). One synthesis request per interviewer turn, an idle-socket reconnect, and one automatic retry if a turn returns no audio.
- **Turn taking:** headphones mode allows barge-in; speakers mode mutes the candidate while the interviewer talks so it never hears itself.
- **Brain:** an opening question set is generated from the job description; the live interviewer follows up and ends the call with a tool call. Feedback is generated once the call ends.

## Bring your own keys

Anyone can try Rapport with their own Gnani key and an LLM key (OpenRouter or Gemini).

- Keys go to the Python server over HTTPS because browsers cannot set the websocket auth headers Gnani requires.
- They are held in memory for one interview and dropped when it ends.
- They are never written to the database, logs or error reports; log output is scrubbed of every live key, and validation errors never echo submitted values.
- Signing in saves interviews, never keys.

## Security notes

- Auth0 (Google) sign-in. The Next.js server forwards the user's ID token to the API, which verifies it against the tenant's JWKS. The token never reaches browser JavaScript.
- Every API route is owner-scoped: candidates see their own interviews, recruiters see interviews for their own invites, guests need a per-interview token.
- The `/api/backend` bridge requires a custom header and a same-origin `Origin` on writes (CSRF), and only forwards to fixed API paths.
- The voice websocket checks `Origin` and takes a single-use, short-lived ticket as its first message (never in the URL).
- Abuse limits: concurrent sessions per IP and globally, sessions per IP per hour and per account per day, and a hard 14-minute cap (Gnani's realtime limit is 15).

## Fairness check

`server/scripts/fairness_eval.py` scores the same three answers written in English, Hindi (Devanagari) and Hinglish (Roman). On 15 Nov 2026 with `gemini-3.5-flash-lite`, three runs each: **8.0 / 8.0 / 8.0 overall, 0.00-point spread**, no quotes rejected.

## Repository layout

```
client/   Next.js (JavaScript) web app
server/   Python API: FastAPI, Pipecat, Gnani, MongoDB
docs/     Build brief
```

## Running locally

Requirements: Python 3.12, Node 20+, a MongoDB URI, an Auth0 application with Google enabled.

```bash
# 1. Secrets
cp .env.example .env                 # Auth0, MongoDB, INTERNAL_API_SECRET (+ your keys for testing)
cp client/.env.example client/.env.local   # same Auth0 values, AUTH0_SECRET, API_URL, NEXT_PUBLIC_WS_URL

# 2. API
cd server
python -m venv .venv
.venv/Scripts/activate               # Windows; on macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# 3. Web app (new terminal)
cd client
npm install
npm run dev                          # http://localhost:3000
```

Auth0 application settings: Allowed Callback URLs `http://localhost:3000/auth/callback`, Allowed Logout URLs `http://localhost:3000`. To let "Delete my data" remove the Auth0 profile too, authorise the application for the Auth0 Management API with the `delete:users` scope.

## Deploying

- **API:** `server/Dockerfile`. Run it as a persistent container (Render, Railway, Fly.io, a VM). It holds long-lived voice websockets, so serverless functions won't work. Set `CLIENT_ORIGINS` to the web app's URL, `TRUST_PROXY_HEADERS=true` behind a proxy, plus the `.env` values.
- **Web app:** Vercel or any Next.js host. Set the `client/.env.example` values, with `API_URL` pointing at the API and `NEXT_PUBLIC_WS_URL` at its `wss://` URL. Add the production callback and logout URLs in Auth0.

## Privacy

Stored: transcripts, scores and feedback; templates and invites for recruiters; your Google name, email and picture. Not stored: API keys, audio, camera video. Guest interviews expire after 48 hours unless saved. Transcripts are sent to your chosen LLM provider. See `/privacy` in the app.
