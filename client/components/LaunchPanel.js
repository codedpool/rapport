"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, loadKeys, saveGuestToken, setLive, storeKeys } from "@/lib/api";
import { Seg } from "@/components/SpecFields";

const VOICES = [
  { id: "Shivani", label: "Shivani", note: "calm, clear" },
  { id: "Chetana", label: "Chetana", note: "warm" },
  { id: "Riyaa", label: "Riyaa", note: "confident" },
  { id: "Avinash", label: "Avinash", note: "professional" },
  { id: "Devansh", label: "Devansh", note: "conversational" },
  { id: "Prakash", label: "Prakash", note: "steady" },
];

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", hint: "Key starts with sk-or-. Default model google/gemini-2.5-flash." },
  { id: "gemini", label: "Gemini", hint: "Google AI Studio key. Default model gemini-3.5-flash-lite." },
];

export default function LaunchPanel({ mode = "mock", spec, assignmentId, validate }) {
  const router = useRouter();
  const [keys, setKeys] = useState({ gnani_api_key: "", llm_provider: "openrouter", llm_api_key: "", llm_model: "" });
  const [remember, setRemember] = useState(false);
  const [voice, setVoice] = useState("Shivani");
  const [engine, setEngine] = useState("expressive");
  const [headphones, setHeadphones] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = loadKeys();
    if (saved) {
      // Tab storage is only readable after mount; reading it during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKeys((k) => ({ ...k, ...saved }));
      setRemember(true);
    }
  }, []);

  const setKey = (k) => (e) => setKeys({ ...keys, [k]: e.target.value });
  const provider = PROVIDERS.find((p) => p.id === keys.llm_provider);

  async function start(e) {
    e.preventDefault();
    setError("");
    const problem = validate?.();
    if (problem) return setError(problem);
    if (!keys.gnani_api_key.trim() || !keys.llm_api_key.trim()) return setError("Paste both keys to start.");
    if (!consent) return setError("Please confirm the recording notice.");
    setBusy(true);
    try {
      // Ask for the mic now, inside the click, so the browser prompt appears right away.
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch {
      setBusy(false);
      return setError("Microphone access is needed for a voice interview.");
    }
    const cleanKeys = {
      gnani_api_key: keys.gnani_api_key.trim(),
      llm_provider: keys.llm_provider,
      llm_api_key: keys.llm_api_key.trim(),
      llm_model: keys.llm_model.trim() || null,
    };
    storeKeys(cleanKeys, remember);
    try {
      const res = await api("sessions", {
        method: "POST",
        body: {
          mode, spec: mode === "mock" ? spec : null, assignment_id: assignmentId || null,
          keys: cleanKeys, voice, voice_engine: engine, barge_in: headphones, consent: true,
        },
      });
      if (res.guest_token) saveGuestToken(res.interview_id, res.guest_token);
      setLive({ session_id: res.session_id, ticket: res.ticket, interview_id: res.interview_id, spec: res.spec, voice, headphones });
      router.push("/interview/live");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={start} className="space-y-6">
      <div>
        <h3 className="font-semibold">Your keys</h3>
        <p className="text-sm text-muted mt-1">
          Sent to the Rapport server for this interview only, held in memory, never stored or logged, and dropped when
          the interview ends.
        </p>
      </div>
      <div>
        <label className="field-label" htmlFor="gnani">Gnani API key</label>
        <input id="gnani" type="password" autoComplete="off" spellCheck={false} className="field font-mono"
          value={keys.gnani_api_key} onChange={setKey("gnani_api_key")} placeholder="From app.gnani.ai" />
      </div>
      <div>
        <span className="field-label">LLM provider</span>
        <Seg label="LLM provider" value={keys.llm_provider} options={PROVIDERS} onChange={(v) => setKeys({ ...keys, llm_provider: v })} />
        <p className="hint">{provider?.hint}</p>
      </div>
      <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
        <div>
          <label className="field-label" htmlFor="llmkey">{provider?.label} API key</label>
          <input id="llmkey" type="password" autoComplete="off" spellCheck={false} className="field font-mono"
            value={keys.llm_api_key} onChange={setKey("llm_api_key")} />
        </div>
        <div>
          <label className="field-label" htmlFor="model">Model <span className="text-muted font-normal">(optional)</span></label>
          <input id="model" className="field font-mono text-sm" value={keys.llm_model} onChange={setKey("llm_model")} placeholder="default" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" className="accent-[var(--accent)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Remember keys in this browser tab until I close it
      </label>

      <div className="border-t border-line pt-6 space-y-5">
        <div>
          <span className="field-label">Interviewer voice</span>
          <div className="flex flex-wrap gap-2">
            {VOICES.map((v) => (
              <button type="button" key={v.id} onClick={() => setVoice(v.id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${voice === v.id ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink-2"}`}>
                <span className="font-medium">{v.label}</span>
                <span className={`block text-xs ${voice === v.id ? "text-paper/70" : "text-muted"}`}>{v.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="field-label">Voice engine</span>
          <Seg label="Voice engine" value={engine} onChange={setEngine}
            options={[{ id: "expressive", label: "Expressive (Timbre v3)" }, { id: "fast", label: "Fast (Timbre v2.5)" }]} />
          <p className="hint">
            {engine === "expressive"
              ? "Natural pauses and breath. Response time can vary a little."
              : "Quickest replies, plainer delivery. Uses a language-matched voice."}
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={headphones} onChange={(e) => setHeadphones(e.target.checked)} />
          <span>
            <span className="font-medium">I&apos;m wearing headphones</span>
            <span className="block text-sm text-muted">
              Lets you interrupt the interviewer mid-sentence. On speakers we pause your mic while the interviewer talks so it
              doesn&apos;t hear itself.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="text-sm text-ink-2">
            I understand my voice is transcribed by Gnani, the transcript is sent to my chosen LLM provider to run the
            interview and write feedback, and the transcript and feedback are saved (audio is not). Camera preview stays
            on my device.
          </span>
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      <button className="btn btn-accent w-full sm:w-auto" disabled={busy}>
        {busy ? "Checking keys and preparing questions…" : "Start interview"}
      </button>
    </form>
  );
}
