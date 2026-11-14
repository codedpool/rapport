# Rapport - Build Brief

A self-contained brief for building Rapport, a multilingual voice interview platform. Decisions marked **Locked** were made by the product owner. Items marked **Proposed** are recommendations, not confirmed choices. Integration facts were verified against Gnani's live documentation and API on 14 Nov 2026.

## 1. What Rapport is

Rapport is a voice-AI interview platform. A candidate has a spoken interview in Hindi, English or Hinglish, gets relevant follow-up questions, and receives feedback that quotes what they actually said. The idea in one line: the candidate stays in the language they think in, and the interview judges what they say, not how English it sounds. That fairness is a product goal to build and test toward, not a property any vendor model guarantees out of the box.

## 2. Locked decisions

- **Name:** Rapport. Fresh build in a new repository; no code carried over from the earlier SilkHR project.
- **Architecture:** separate frontend and backend.
  - **Frontend:** Next.js, JavaScript (not TypeScript). Use the current stable Next.js release at implementation time; no version is pinned here.
  - **Backend:** Python. It carries the interview logic and the voice engine.
  - **Database:** MongoDB.
  - **Auth:** Auth0, with Google login.
- **BYOK (bring your own key):** anyone can test the platform by pasting their own API keys.
- **Google login:** people can save and revisit their interviews and feedback.
- **Voice goal:** expressive and human-like.

## 3. Proposed defaults (recommendations, not locked)

- **Guest first, sign in to save:** let a visitor start an interview immediately; offer Google login when they want to keep it. Friction stays at zero for a first try.
- **One engine, two doors:** candidate interview practice as the lead product; employer screening as a second mode of the same engine, designed in from the start.
- **Natural conversation through a proven framework:** with the backend in Python, Gnani's LiveKit Agents and Pipecat integrations are available and slot into it, providing streaming, turn-taking and interruption machinery instead of hand-rolling it. They still require wiring and testing, including tuning for echo and speaker bleed. Push-to-talk is a legitimate simpler first milestone if a demo is needed sooner. All-JavaScript voice (calling Gnani's APIs directly and hand-rolling turn-taking) is also technically possible, but the locked Python backend makes the framework path the natural fit.

## 4. Architecture

- **Browser (Next.js, JavaScript):** interview UI, audio playback, the key paste screen, Auth0 login. Microphone capture: raw PCM through the Web Audio API on the direct-integration path; on the framework path, LiveKit/Pipecat ship their own browser SDKs and transports - pick one transport model, not both.
- **Python backend:** the interview brain (an LLM writes follow-up questions and scores answers), the relay for realtime speech to Gnani (holding the guest key in memory only), and persistence of saved interviews in MongoDB keyed by the Auth0 user ID.
- **Voice:** Gnani realtime STT and TTS via the official `gnani-vachana` Python SDK (it wraps REST, SSE and WebSocket), or via the LiveKit Agents / Pipecat plugins on the framework path.
- **MongoDB:** interviews, transcripts, scores and feedback. No API keys are stored.
- **Deployment:** the backend holds long-lived voice connections. Host it as a persistent process (container or VM), not as short-lived serverless functions.

## 5. Gnani integration facts (verified 14 Nov 2026)

### Speech-to-text

- **Realtime:** `WSS wss://api.vachana.ai/stt/v3/stream`. Auth: `x-api-key-id` upgrade header. Takes raw PCM frames (`x-sample-rate`: 8000 / 16000 / 44100 / 48000). Server-side VAD with tunable headers (`x-vad-threshold`, `x-min-silence-ms`, `x-min-speech-ms`, `x-min-segment-ms`, `x-max-speech-s`). Session cap 15 minutes. Idle timeout default 60 s, settable 5-900 via `x-idle-timeout-sec` - raise it so a thinking candidate is not cut off.
- **Models:** `prisma-v2.5` (default) or `prisma-v3.0`. `language_code`: one language, `indic-auto`, or (v3.0) up to 4 comma-separated hints such as `hi-IN,en-IN`. v3.0 returns `detected_language_code`; treat it as a cue, not proof of reliable Hinglish or code-switch detection. Let the user pick their interview language explicitly, allow switching mid-interview, and test any automatic voice-following on real answers before claiming it. v3.0 also accepts `keyterms` (up to 200) and `topic` hints, and offers `verbatim` / `transcribe` / `codemix` / `transliterate` output styles.
- **REST:** `POST /stt/v3`, clips up to 30 seconds.
- **Batch:** jobs up to 4 hours per file (out of scope for v1).

### Text-to-speech

- **Endpoints:** REST `POST https://api.vachana.ai/api/v1/tts/inference`; SSE streaming; Realtime `WSS wss://api.vachana.ai/api/v1/tts`. Auth: `X-API-Key-ID` header on all.
- **Timbre v3.0:** 13 voices, each speaks all 10 supported languages. Supports 13 inline audio tags for expressive delivery (laugh, giggle, sigh, exhale, sniffle, yawn, cough, clearing throat, whispers, shouting, energetic, stretches, pauses). A tag applies from its position to the next tag or the end of the text. Tags are documented on REST and advertised on the realtime endpoint.
- **Timbre v2.5:** 42 voices, one preferred language each. Poorvi is the dedicated Hinglish (`hi-en`) voice, v2.5-only, and takes no audio tags.
- **Voice model choice needs a live test:** `hi-en` is a documented `language` value, but the v3.0 catalog lists only the 10 languages without `hi-en`. Whether a v3.0 voice handles code-mixed Hinglish text well is unverified - synthesize real Hinglish lines before committing. v2.5 Poorvi is the no-tags fallback.
- **Speed:** tunable 0.85-1.15.
- **Input formatting:** pre-format numbers, dates and currency as spoken words (see the Input Formatting Guide) for reliable pronunciation.

### Auth and networking

- Realtime STT and TTS authenticate via WebSocket upgrade headers, which browsers cannot set. The realtime path must run through the backend; header auth only, no documented query-param fallback.
- On 14 Nov 2026 the STT and TTS REST endpoints answered a cross-origin preflight advertising any origin and the `x-api-key-id` header. A preflight is only an advertisement; prove a real browser POST before building a browser-direct path.
- Rate limits, concurrency caps and credit burn rates are visible only inside the Gnani dashboard. A per-organisation cap on concurrent realtime streams applies; a rejected connection returns an error naming the limit. `429` responses use error code `RATE_LIMITED`; retry with backoff.

### Out of scope for v1

- Voice cloning (requires the speaker's consent; no interview use case chosen).
- Telephony interviews; batch transcription.

## 6. Key handling, security and privacy

- **Guest keys are session-only.** On the relay path a guest key lives in backend memory for the length of the session. Never write it to a database, logs, analytics or error reports. Drop it when the session closes. One session, one key: no session sees another session's key or audio. State this plainly on the key paste screen, including that a backend handles the key - BYOK alone does not promise the key stays in the browser.
- **Save interviews, not keys.** Signing in saves transcripts, scores and feedback history. It must not silently save API keys. A "remember my key" option may come later only as an explicit opt-in, stored encrypted.
- **Owner-only authorization:** every backend request checks that the signed-in user owns the resource it touches. Being logged in is not enough.
- **Deletion is wider than one table:** a delete-my-data path covers the Auth0 identity profile, the app's database rows, and any backups, logs and provider-side retention, each on its own terms. State on the site what is stored and when it is deleted. (Relevant to India's DPDP Act.)
- **Abuse controls:** a lightweight bot check (for example Cloudflare Turnstile) before a session starts; per-account and per-IP session caps; a per-session minute cap. With BYOK, guests burn their own Gnani credits, but anything on the platform's own keys (the LLM, hosting) is uncapped without these limits.

## 7. Auth setup notes (Auth0 + Google)

- Auth0 is the identity layer only: sign-in, session, tokens, user profile. Interviews, transcripts and feedback live in the app's own MongoDB, keyed by the Auth0 user ID.
- A new Auth0 tenant's default Google connection runs on Auth0's shared developer keys, which are not for real users. Before launch, create a Google Cloud OAuth client (consent screen showing "Rapport") and paste those credentials into the Auth0 Google connection.

## 8. Proposed priorities

The checklist below is a proposed build order, conditional on the open launch choices in section 9 (conversation feel, voice model, guest flow). Nothing here is settled sequencing.

### P0 - the demo loop, done right

1. Guest lands, pastes a Gnani key, the app validates it with one tiny test call, they pick a role or persona, and an interview starts in Hindi, English or Hinglish.
2. Python backend relays realtime speech: STT Realtime (prisma-v3.0) with `indic-auto` or `hi-IN,en-IN`; idle timeout raised above the 60-second default.
3. TTS for interviewer questions over streaming. If the v3.0 Hinglish test passes, v3.0 with light audio tags for warmth - a calm, attentive interviewer: short turns, natural pauses, restrained expression. Tags everywhere sound worse than none.
4. The LLM scores answers and writes follow-ups, with feedback quoting what the candidate actually said.
5. Google login offered when they want to save: interview, transcript and feedback stored against their account.
6. The key-handling, ownership and account-data rules in section 6 are part of P0, not a later hardening pass.

### P1 - differentiators, claimed only after testing

1. Language cues and control: v3.0 returns `detected_language_code`, so the interviewer's voice can offer to follow when a candidate drifts between Hindi and Hinglish. Pair with an explicit language picker and manual override; test on real answers before claiming it.
2. `keyterms` (up to 200) and `topic` biasing for role vocabulary; `codemix` output keeps English words in Latin script.
3. Reconnect logic for the 15-minute realtime session cap.
4. Mobile layout.

### P2 - later

1. Conversation-feel upgrade, whichever way the open choice lands: if the first version ships push-to-talk, the framework path (LiveKit Agents or Pipecat with Gnani's Python plugins) brings natural interruption; if it ships on the framework, this slot is tuning - echo, speaker bleed, response timing.
2. Telephony interviews, where Gnani's noise handling is aimed.
3. Optional "remember my key" for returning signed-in users, explicit opt-in and encrypted.

## 9. Open decisions (owner's calls, not yet made)

- **Whose LLM key:** guests bring their own, or the platform's key funds capped demo sessions.
- **Voice model:** v3.0 with tags if the live Hinglish test passes; v2.5 Poorvi as the no-tags fallback. Decided by ear, on real lines.
- **Conversation feel at launch:** push-to-talk first, or straight to natural interruption via the framework path.
- **Retention defaults:** exactly what a saved interview stores (audio, transcript, scores) and its deletion behaviour, stated on the site.
- **Dashboard verification:** sign in to app.gnani.ai to confirm credits, key limits and concurrency before building on them.

## 10. Constraints to read before building

- Realtime sessions cap at 15 minutes; REST clips cap at 30 seconds.
- Browsers cannot set WebSocket auth headers, so the realtime path runs through the Python backend, not browser-direct.
- The backend holds long-lived voice connections; host it as a persistent process, not per-request serverless functions.
- Per-account rate limits and credit burn rates are only visible inside the Gnani dashboard.
- Voice quality, barge-in behaviour and echo across real speakers, headphones and accents need testing before any demo claims them.
- The CORS preflight result is what Gnani's API advertised on 14 Nov 2026; it is not proof a browser POST succeeds. Re-check before building a browser-direct path around it.

## 11. Sources

- STT Realtime: https://docs.gnani.ai/api/STT/stt-websocket
- STT limits: https://docs.gnani.ai/api/STT/limits
- Prisma v3.0 model: https://docs.gnani.ai/api/STT/models/prisma-v3
- TTS REST: https://docs.gnani.ai/api/TTS/tts-inference
- TTS Streaming (SSE): https://docs.gnani.ai/api/TTS/tts-sse
- TTS Realtime: https://docs.gnani.ai/api/TTS/tts-websocket
- Audio tags: https://docs.gnani.ai/api/TTS/tts-audio-tags
- Voice catalog: https://docs.gnani.ai/api/TTS/available-voices
- Input formatting guide: https://docs.gnani.ai/api/TTS/tts-input-formating
- Python SDK: https://docs.gnani.ai/python-sdk/introduction
- LiveKit plugin: https://docs.gnani.ai/livekit/introduction
- Pipecat plugin: https://docs.gnani.ai/pipecat/introduction
- Auth0 pricing: https://auth0.com/pricing
- Auth0 Google connection setup: https://developer.auth0.com/resources/labs/authentication/google-social-connection-to-login
