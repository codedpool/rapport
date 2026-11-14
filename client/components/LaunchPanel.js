"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Eye, EyeOff, Headphones, Lock } from "lucide-react";
import { api, loadKeys, saveGuestToken, setLive, storeKeys } from "@/lib/api";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";

const VOICES = [
  { id: "Shivani", note: "Calm, clear" },
  { id: "Chetana", note: "Warm" },
  { id: "Riyaa", note: "Confident" },
  { id: "Avinash", note: "Professional" },
  { id: "Devansh", note: "Conversational" },
  { id: "Prakash", note: "Steady" },
];

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", keyLabel: "OpenRouter key", placeholder: "sk-or-…" },
  { id: "gemini", label: "Gemini", keyLabel: "Google AI Studio key", placeholder: "AIza…" },
];

function SecretField({ id, label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} autoComplete="off" spellCheck={false}
          className="field font-mono !pr-11" value={value} onChange={onChange} placeholder={placeholder} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide key" : "Show key"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-ink">
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

export default function LaunchPanel({ mode = "mock", spec, assignmentId }) {
  const router = useRouter();
  const [keys, setKeys] = useState({ gnani_api_key: "", llm_provider: "openrouter", llm_api_key: "", llm_model: "" });
  const [remember, setRemember] = useState(false);
  const [voice, setVoice] = useState("Shivani");
  const [engine, setEngine] = useState("expressive");
  const [headphones, setHeadphones] = useState(false);
  const [consent, setConsent] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = loadKeys();
    if (saved) {
      // Tab storage is only readable after mount; reading it during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKeys((k) => ({ ...k, ...saved, llm_model: saved.llm_model || "" }));
      setRemember(true);
    }
  }, []);

  const provider = PROVIDERS.find((p) => p.id === keys.llm_provider);

  async function start(e) {
    e.preventDefault();
    setError("");
    if (!keys.gnani_api_key.trim() || !keys.llm_api_key.trim()) return setError("Paste both keys to start.");
    if (!consent) return setError("Tick the box to confirm how your interview is processed.");
    setBusy(true);
    try {
      // Ask for the mic inside the click so the browser prompt appears straight away.
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch {
      setBusy(false);
      return setError("Allow microphone access to start a voice interview.");
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
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 shrink-0 rounded-xl bg-accent-soft text-accent grid place-items-center"><Lock size={17} /></span>
          <p className="text-[0.95rem] text-ink-2 leading-relaxed">
            Your keys go to Rapport&apos;s server for this interview only. They&apos;re held in memory, never saved or logged,
            and dropped when it ends.
          </p>
        </div>
        <SecretField id="gnani" label="Gnani API key" placeholder="From app.gnani.ai" value={keys.gnani_api_key}
          onChange={(e) => setKeys({ ...keys, gnani_api_key: e.target.value })} />
        <div>
          <span className="field-label">LLM provider</span>
          <Segmented label="LLM provider" size="sm" value={keys.llm_provider} options={PROVIDERS}
            onChange={(v) => setKeys({ ...keys, llm_provider: v })} />
        </div>
        <SecretField id="llm" label={provider.keyLabel} placeholder={provider.placeholder} value={keys.llm_api_key}
          onChange={(e) => setKeys({ ...keys, llm_api_key: e.target.value })} />
        <label className="flex items-center gap-2.5 text-[0.95rem] text-ink-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember my keys in this tab until I close it
        </label>
      </div>

      <div className="rounded-2xl border border-line bg-white">
        <button type="button" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}
          className="w-full flex items-center justify-between gap-3 p-5 sm:px-6 text-left">
          <span>
            <span className="block font-semibold text-ink">Voice and audio</span>
            <span className="block text-[0.92rem] text-muted">
              {voice}, {engine === "expressive" ? "expressive voice" : "fast voice"}, {headphones ? "headphones" : "speakers"}
            </span>
          </span>
          <motion.span animate={{ rotate: moreOpen ? 180 : 0 }} className="text-muted"><ChevronDown size={20} /></motion.span>
        </button>
        <AnimatePresence initial={false}>
          {moreOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="px-5 sm:px-6 pb-6 space-y-6 border-t border-line pt-5">
                <div>
                  <span className="field-label">Interviewer</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VOICES.map((v) => (
                      <button type="button" key={v.id} onClick={() => setVoice(v.id)} aria-pressed={voice === v.id}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${voice === v.id ? "border-accent bg-accent text-white" : "border-line hover:border-ink-2"}`}>
                        <span className="block font-semibold">{v.id}</span>
                        <span className={`block text-[0.85rem] ${voice === v.id ? "text-white/75" : "text-muted"}`}>{v.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="field-label">Voice style</span>
                  <Segmented label="Voice style" size="sm" value={engine} onChange={setEngine}
                    options={[{ id: "expressive", label: "Expressive" }, { id: "fast", label: "Fastest replies" }]} />
                  <p className="hint">
                    {engine === "expressive" ? "Natural pauses and breath. Reply time varies a little." : "Quickest replies with a plainer delivery."}
                  </p>
                </div>
                <Switch checked={headphones} onChange={setHeadphones}
                  title={<span className="inline-flex items-center gap-2"><Headphones size={17} /> I&apos;m wearing headphones</span>}
                  body="Lets you interrupt mid-sentence. On speakers your mic pauses while the interviewer talks." />
                <div>
                  <label className="field-label" htmlFor="model">Model <span className="font-normal text-muted">(optional)</span></label>
                  <input id="model" className="field font-mono text-sm" value={keys.llm_model}
                    onChange={(e) => setKeys({ ...keys, llm_model: e.target.value })} placeholder="Use the default" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <label className="flex items-start gap-3 cursor-pointer text-[0.95rem] text-ink-2 leading-relaxed">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--accent)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Gnani transcribes my voice, my LLM provider runs the interview, and the transcript and feedback are saved. Audio
          and camera are never stored. <Link href="/privacy" className="underline underline-offset-4 text-accent">Details</Link>
        </span>
      </label>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-danger">{error}</p>}
      <button className="btn btn-accent w-full text-lg !py-4" disabled={busy}>
        {busy ? "Checking keys and writing your questions…" : "Start the interview"}
      </button>
    </form>
  );
}
