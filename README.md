# Rapport

A multilingual voice interview platform. Have a spoken interview in Hindi, English or Hinglish, get relevant follow-up questions, and receive feedback that quotes what you actually said.

The idea in one line: you stay in the language you think in, and the interview judges what you say, not how English it sounds.

Built for the Gnani AI Voice AI Challenge.

## How it works

```
Browser (Next.js)  <--websocket-->  Python server (FastAPI + Pipecat)  <-->  Gnani STT / TTS
                                              |                       <-->  LLM (OpenRouter or Gemini)
                                              +--> MongoDB (saved interviews)
```

- **Speech in:** Gnani Prisma v3.0 realtime STT (`codemix` output keeps English terms in Latin script).
- **Speech out:** Gnani Timbre v3.0 realtime TTS with light audio tags for a calm, human delivery.
- **Brain:** an LLM writes follow-up questions and scores answers. Feedback quotes the candidate's own words.
- **Auth:** Auth0 with Google login, to save and revisit interviews.

## Bring your own keys

Anyone can try Rapport by pasting their own keys: a Gnani key and an LLM key (OpenRouter or Gemini).

- Keys are held in server memory for the length of one session only.
- They are never written to the database, logs or error reports.
- Signing in saves interviews, not keys.

## Repository layout

```
client/   Next.js (JavaScript) web app
server/   Python backend (FastAPI, Pipecat, MongoDB)
docs/     Build brief
```

## Running locally

```bash
cp .env.example .env     # fill in values

# server
cd server
python -m venv .venv && . .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# client (new terminal)
cd client
npm install
npm run dev
```

Setup details are filled in as the build progresses.

## Privacy

Stored: transcripts, scores and feedback for signed-in users. Not stored: API keys, and (in v1) audio. Transcripts are sent to the chosen third-party LLM to generate questions and feedback.
