"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Languages, MessageSquareText, Mic, PhoneOff, Video, VideoOff, X } from "lucide-react";
import Logo from "@/components/Logo";
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
  const [drawer, setDrawer] = useState(false);
  const [langMenu, setLangMenu] = useState(false);

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

  const status =
    phase === "connecting" ? "Connecting to your interviewer"
      : phase === "ending" ? "Wrapping up"
      : phase === "processing" ? "Writing your feedback"
      : botSpeaking ? `${info?.interviewer || "Interviewer"} is speaking`
      : userSpeaking ? "Listening"
      : thinking ? "Thinking"
      : "Your turn";
  const tone = botSpeaking ? "speaking" : userSpeaking ? "listening" : "idle";
  const remaining = info ? info.duration_min * 60 - elapsed : 0;
  const showDots = phase !== "live" || (thinking && !botSpeaking && !userSpeaking);

  if (phase === "error") {
    return (
      <div className="min-h-[100svh] bg-night text-white grid place-items-center px-4">
        <div className="max-w-md text-center">
          <h1 className="display display-tight text-4xl">The interview stopped</h1>
          <p className="mt-4 text-white/75 text-lg">{error}</p>
          <Link href="/practice" className="btn btn-accent mt-8">Start a new interview</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100svh] bg-night text-white overflow-hidden flex flex-col">
      {/* Soft light that follows who is talking. */}
      <motion.div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[46rem] w-[46rem] rounded-full blur-3xl"
        animate={{ backgroundColor: tone === "speaking" ? "rgba(232,179,49,0.16)" : tone === "listening" ? "rgba(63,107,78,0.28)" : "rgba(35,42,92,0.55)" }}
        transition={{ duration: 0.8 }} />

      <header className="relative z-10 flex items-center justify-between gap-4 px-4 sm:px-8 h-16">
        <Logo tone="light" />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/60 hidden sm:inline">{info ? `Interview with ${info.interviewer}` : ""}</span>
          <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 tabular-nums">
            {fmt(elapsed)} / {info ? `${info.duration_min}:00` : "–"}
          </span>
        </div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center pb-36">
        <div className="relative grid place-items-center h-56 w-56 sm:h-64 sm:w-64">
          {[0, 1, 2].map((r) => (
            <motion.span key={r} aria-hidden className="absolute inset-0 rounded-full border"
              style={{ borderColor: tone === "listening" ? "rgba(132,190,150,0.35)" : "rgba(232,179,49,0.28)" }}
              animate={tone === "idle" ? { scale: 1 + r * 0.08, opacity: 0.35 } : { scale: [1 + r * 0.08, 1.25 + r * 0.12], opacity: [0.5, 0] }}
              transition={tone === "idle" ? { duration: 0.6 } : { duration: 2.2, repeat: Infinity, delay: r * 0.5, ease: "easeOut" }} />
          ))}
          <div ref={orbRef} className="h-40 w-40 sm:h-44 sm:w-44 rounded-full transition-[background] duration-700"
            style={{
              background: tone === "listening"
                ? "radial-gradient(circle at 35% 30%, #cfe6d6, #3f6b4e 62%, #1f3a29)"
                : "radial-gradient(circle at 35% 30%, #fbe3a6, #e8b331 55%, #8a5a07)",
              boxShadow: tone === "listening" ? "0 40px 120px -20px rgba(63,107,78,0.7)" : "0 40px 120px -20px rgba(232,179,49,0.55)",
            }} />
        </div>

        <p className="mt-10 text-white/70 text-lg" role="status" aria-live="polite">
          {status}
          {showDots && <Dots />}
        </p>
        <AnimatePresence mode="wait">
          <motion.p key={caption} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 max-w-2xl text-2xl sm:text-[1.7rem] leading-snug text-white min-h-[2.6em]" lang="hi">
            {caption}
          </motion.p>
        </AnimatePresence>
        {remaining < 60 && remaining > 0 && phase === "live" && <p className="mt-3 text-haldi">About a minute left</p>}
        {phase === "live" && !info?.headphones && (
          <p className="mt-6 text-sm text-white/45">On speakers, your mic pauses while the interviewer talks.</p>
        )}
      </section>

      {/* Camera, picture in picture. Never leaves the browser. */}
      <AnimatePresence>
        {cameraOn && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-10 right-4 sm:right-8 top-20 w-36 sm:w-56 aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover -scale-x-100" />
            <span className="absolute left-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: userSpeaking ? "#84be96" : "#9aa1b2", transform: `scale(${1 + micLevel * 2})` }} />
              You
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <nav aria-label="Interview controls" className="absolute z-20 bottom-6 inset-x-0 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl p-2">
          <span className="h-12 w-12 rounded-xl grid place-items-center bg-white/10" title="Microphone on">
            <Mic size={20} className={userSpeaking ? "text-[#84be96]" : "text-white/80"} />
          </span>
          <button onClick={() => setCameraOn((c) => !c)} aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
            className="h-12 w-12 rounded-xl grid place-items-center hover:bg-white/15">
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} className="text-white/60" />}
          </button>
          <div className="relative">
            <button onClick={() => setLangMenu((o) => !o)} aria-expanded={langMenu} aria-label="Interviewer language"
              disabled={phase !== "live"} className="h-12 px-3 rounded-xl flex items-center gap-2 hover:bg-white/15 disabled:opacity-40">
              <Languages size={20} />
              <span className="hidden sm:inline text-sm">{LANGUAGES.find((l) => l.id === language)?.label}</span>
            </button>
            <AnimatePresence>
              {langMenu && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-14 left-1/2 -translate-x-1/2 w-44 rounded-xl bg-white text-ink p-1 shadow-2xl">
                  <p className="px-3 pt-2 pb-1 text-xs text-muted">Interviewer speaks</p>
                  {LANGUAGES.map((l) => (
                    <button key={l.id} onClick={() => { switchLanguage(l.id); setLangMenu(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-paper ${language === l.id ? "font-semibold text-accent" : ""}`}>
                      {l.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setDrawer(true)} aria-label="Show transcript"
            className="h-12 w-12 rounded-xl grid place-items-center hover:bg-white/15 relative">
            <MessageSquareText size={20} />
            {turns.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-haldi" />}
          </button>
          <button onClick={end} disabled={phase !== "live"}
            className="h-12 px-4 rounded-xl flex items-center gap-2 bg-danger hover:bg-[#9b2b23] font-semibold disabled:opacity-40">
            <PhoneOff size={19} />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </nav>

      {/* Transcript drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-30 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)} />
            <motion.aside role="dialog" aria-label="Transcript"
              className="fixed z-40 top-0 right-0 h-full w-full sm:w-[26rem] bg-white text-ink flex flex-col"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 40 }}>
              <div className="flex items-center justify-between px-5 h-16 border-b border-line">
                <h2 className="font-semibold">Transcript</h2>
                <button onClick={() => setDrawer(false)} aria-label="Close transcript" className="p-2 rounded-lg hover:bg-paper"><X size={20} /></button>
              </div>
              <ol className="flex-1 overflow-y-auto p-5 space-y-4">
                {turns.length === 0 && <li className="text-muted">The conversation will appear here as you talk.</li>}
                {turns.map((t, i) => (
                  <li key={i} className={t.role === "candidate" ? "ml-8 rounded-2xl rounded-tr-md bg-sage-soft px-4 py-3" : "mr-8 rounded-2xl rounded-tl-md bg-paper px-4 py-3"}>
                    <span className="block text-xs text-muted mb-1">
                      {t.role === "candidate" ? "You" : info?.interviewer || "Interviewer"}{t.interrupted ? ", interrupted" : ""}
                    </span>
                    <span lang="hi">{t.text}</span>
                  </li>
                ))}
                <li ref={transcriptEnd} aria-hidden />
              </ol>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden className="inline-flex gap-1 ml-2 align-middle">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-white/60"
          animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </span>
  );
}
