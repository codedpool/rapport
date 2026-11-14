"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearLive, peekLive } from "@/lib/api";
import { PcmPlayer, startMic } from "@/lib/audio";
import { LANGUAGES } from "@/components/SpecFields";

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000").replace(/\/$/, "");

function fmt(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function LivePage() {
  const router = useRouter();
  const [phase, setPhase] = useState("connecting"); // connecting | live | ending | processing | error
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [caption, setCaption] = useState("");
  const [turns, setTurns] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [language, setLanguage] = useState("en");
  const [cameraOn, setCameraOn] = useState(true);
  const [micLevel, setMicLevel] = useState(0);

  const wsRef = useRef(null);
  const playerRef = useRef(null);
  const micRef = useRef(null);
  const camRef = useRef(null);
  const videoRef = useRef(null);
  const orbRef = useRef(null);
  const startRef = useRef(0);
  const endingRef = useRef(false);
  const transcriptEnd = useRef(null);

  // Connect once (the timeout absorbs React's development double-mount).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const live = peekLive();
      if (!live || Date.now() - live.at > 110_000) {
        setPhase("error");
        setError("This interview link has expired. Start a new one.");
        return;
      }
      setLanguage(live.spec?.language || "en");
      const player = new PcmPlayer(24000);
      playerRef.current = player;
      player.resume().catch(() => {});

      const ws = new WebSocket(`${WS_URL}/ws/${live.session_id}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", ticket: live.ticket }));
        clearLive();
      };
      ws.onmessage = async (ev) => {
        if (typeof ev.data !== "string") {
          player.push(ev.data);
          return;
        }
        let e;
        try { e = JSON.parse(ev.data); } catch { return; }
        switch (e.type) {
          case "ready":
            setInfo({ ...e, interview_id: live.interview_id, headphones: live.headphones });
            startRef.current = Date.now();
            setPhase("live");
            try {
              micRef.current = await startMic({
                onFrame: (buf) => { if (ws.readyState === 1) ws.send(buf); },
                onLevel: (l) => setMicLevel(l),
              });
            } catch {
              setError("Could not open the microphone.");
            }
            setThinking(true);
            break;
          case "bot_speaking":
            setBotSpeaking(e.value);
            if (e.value) setThinking(false);
            break;
          case "user_speaking":
            setUserSpeaking(e.value);
            if (!e.value) setThinking(true);
            break;
          case "interrupt":
            player.flush();
            break;
          case "bot_text":
            setCaption(e.text);
            break;
          case "bot_turn":
            setTurns((t) => [...t, { role: "interviewer", text: e.text, interrupted: e.interrupted }]);
            break;
          case "user_turn":
            setTurns((t) => [...t, { role: "candidate", text: e.text }]);
            setThinking(true);
            break;
          case "language":
            setLanguage(e.language);
            break;
          case "status":
            endingRef.current = true;
            if (e.status === "ending") setPhase("ending");
            if (e.status === "processing") setPhase("processing");
            break;
          case "done":
            micRef.current?.stop();
            if (e.status === "abandoned") {
              setPhase("error");
              setError("The interview ended before you answered, so there is nothing to score.");
            } else {
              router.replace(`/results/${live.interview_id}`);
            }
            break;
          case "error":
            setPhase("error");
            setError(e.message || "The interview could not start.");
            break;
        }
      };
      ws.onclose = () => {
        micRef.current?.stop();
        if (cancelled) return;
        // The voice pipeline closes the socket when the interview ends; feedback is
        // still being written server-side, and the results page waits for it.
        if (endingRef.current) {
          router.replace(`/results/${live.interview_id}`);
          return;
        }
        setPhase((p) => (p === "live" || p === "connecting" ? "error" : p));
        setError((m) => m || "The connection closed.");
      };
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      micRef.current?.stop();
      playerRef.current?.close();
      try { wsRef.current?.close(); } catch {}
    };
  }, [router]);

  // Local camera preview. Never sent anywhere.
  useEffect(() => {
    if (!cameraOn) {
      camRef.current?.getTracks().forEach((t) => t.stop());
      camRef.current = null;
      return;
    }
    let stopped = false;
    navigator.mediaDevices?.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        camRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraOn(false));
    return () => {
      stopped = true;
      camRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn]);

  // Timer and orb animation.
  useEffect(() => {
    let raf;
    const tick = () => {
      if (startRef.current) setElapsed((Date.now() - startRef.current) / 1000);
      const lvl = playerRef.current?.level() || 0;
      if (orbRef.current) orbRef.current.style.transform = `scale(${1 + Math.min(lvl * 0.6, 0.18)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  const end = () => {
    endingRef.current = true;
    if (wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify({ type: "end" }));
    setPhase("ending");
  };
  const switchLanguage = (lang) => {
    if (wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify({ type: "set_language", language: lang }));
  };

  const orbState = botSpeaking ? "speaking" : userSpeaking ? "listening" : thinking ? "thinking" : "idle";
  const status =
    phase === "connecting" ? "Connecting…"
      : phase === "ending" ? "Wrapping up…"
      : phase === "processing" ? "Writing your feedback…"
      : botSpeaking ? `${info?.interviewer || "Interviewer"} is speaking`
      : userSpeaking ? "Listening…"
      : thinking ? "Thinking…"
      : "Your turn";
  const remaining = info ? info.duration_min * 60 - elapsed : 0;

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="display text-3xl">Interview stopped</h1>
        <p className="mt-3 text-ink-2">{error}</p>
        <Link href="/practice" className="btn btn-primary mt-8">Start a new interview</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted">{info ? `Interview with ${info.interviewer}` : "Interview"}</div>
          <div className="font-mono text-2xl tabular-nums" aria-live="off">
            {fmt(elapsed)} <span className="text-muted text-base">/ {info ? `${info.duration_min}:00` : "–"}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted" htmlFor="lang">Interviewer language</label>
          <select id="lang" className="field !w-auto !py-2" value={language} disabled={phase !== "live"}
            onChange={(e) => switchLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <button className="btn btn-danger !py-2" onClick={end} disabled={phase !== "live"}>End interview</button>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <section className="card p-6 sm:p-10 flex flex-col items-center justify-center min-h-[26rem] text-center">
          <div ref={orbRef} className="orb" data-state={orbState} aria-hidden />
          <div className="mt-8 font-medium" role="status" aria-live="polite">{status}</div>
          {remaining < 60 && remaining > 0 && phase === "live" && (
            <div className="mt-2 text-sm text-amber">About a minute left</div>
          )}
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink-2 min-h-[3.5rem]">{caption}</p>
          {phase === "live" && !info?.headphones && (
            <p className="mt-4 text-xs text-muted">Speakers mode: your mic pauses while the interviewer talks.</p>
          )}
        </section>

        <section className="flex flex-col gap-6">
          <div className="card overflow-hidden relative aspect-video bg-ink">
            {cameraOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover -scale-x-100" />
            ) : (
              <div className="h-full w-full grid place-items-center text-paper/70 text-sm">Camera off</div>
            )}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="chip !bg-black/50 !text-white !border-white/20">
                <span className="h-2 w-2 rounded-full" style={{ background: userSpeaking ? "#7fd3a0" : "#aaa", transform: `scale(${1 + micLevel * 2})` }} />
                You
              </span>
              <button className="chip !bg-black/50 !text-white !border-white/20" onClick={() => setCameraOn((c) => !c)}>
                {cameraOn ? "Turn camera off" : "Turn camera on"}
              </button>
            </div>
          </div>
          <div className="card p-5 flex-1 max-h-80 overflow-y-auto">
            <div className="text-sm font-semibold text-ink-2 mb-3">Transcript</div>
            {turns.length === 0 && <p className="text-sm text-muted">The conversation will appear here.</p>}
            <ol className="space-y-3">
              {turns.map((t, i) => (
                <li key={i} className={t.role === "candidate" ? "rounded-xl bg-sage-soft px-3 py-2" : "px-1"}>
                  <span className="block text-[0.7rem] uppercase tracking-wider text-muted">
                    {t.role === "candidate" ? "You" : info?.interviewer || "Interviewer"}
                    {t.interrupted ? " · interrupted" : ""}
                  </span>
                  <span className="text-[0.95rem]">{t.text}</span>
                </li>
              ))}
            </ol>
            <div ref={transcriptEnd} />
          </div>
          <p className="text-xs text-muted">Camera preview stays on this device. Only your voice is sent, to transcribe your answers.</p>
        </section>
      </div>
    </div>
  );
}
