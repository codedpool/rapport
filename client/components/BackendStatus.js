"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2 } from "lucide-react";

// The API runs on a free host that sleeps when idle. Check it on load (and when the API
// reports it's unreachable), and while it wakes show a toast instead of failing quietly.
const QUICK_MS = 3500; // an awake API answers well inside this
const POLL_MS = 3000;
const RECHECK_AFTER_MS = 10 * 60 * 1000; // the host sleeps after ~15 idle minutes

async function ping(timeout) {
  try {
    const res = await fetch("/api/backend/meta", {
      headers: { "x-requested-with": "rapport" }, cache: "no-store", signal: AbortSignal.timeout(timeout),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function BackendStatus() {
  const [state, setState] = useState("idle"); // idle | waking | ready
  const [seconds, setSeconds] = useState(0);
  const waking = useRef(false);
  const lastOk = useRef(0);

  useEffect(() => {
    let alive = true;
    let tick;

    async function wake() {
      if (waking.current) return;
      waking.current = true;
      const started = Date.now();
      setSeconds(0);
      setState("waking");
      tick = setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 1000);
      while (alive && !(await ping(20_000))) {
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      clearInterval(tick);
      waking.current = false;
      if (!alive) return;
      lastOk.current = Date.now();
      setState("ready");
      setTimeout(() => alive && setState((s) => (s === "ready" ? "idle" : s)), 2500);
    }

    async function check() {
      if (waking.current) return;
      if (await ping(QUICK_MS)) lastOk.current = Date.now();
      else wake();
    }

    const onDown = () => wake();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastOk.current > RECHECK_AFTER_MS) check();
    };
    check();
    window.addEventListener("rapport:backend-down", onDown);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(tick);
      window.removeEventListener("rapport:backend-down", onDown);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div aria-live="polite" className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md pointer-events-none">
      <AnimatePresence>
        {state !== "idle" && (
          <motion.div key={state} role="status"
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-white/95 backdrop-blur px-4 py-3 shadow-[0_18px_40px_-18px_rgba(74,26,20,0.45)]">
            {state === "waking" ? (
              <>
                <Loader2 size={20} className="mt-0.5 shrink-0 text-haldi animate-spin" aria-hidden />
                <div className="text-sm">
                  <p className="font-semibold text-ink">Backend isn&apos;t active yet</p>
                  <p className="text-ink-2">Please wait while the backend spins up. This can take up to a minute on the free tier.
                    {seconds > 0 && <span className="text-muted"> ({seconds}s)</span>}</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-sage" aria-hidden />
                <p className="text-sm font-semibold text-ink">Backend is ready.</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
