"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

// The server can't know the visitor's "reduce motion" setting, so the first client
// render must match the server (motion on). The real preference applies right after
// hydration; reading it during the first render causes a hydration mismatch.
export default function useReducedMotionSafe() {
  const prefers = useReducedMotion();
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduce(Boolean(prefers));
  }, [prefers]);
  return reduce;
}
