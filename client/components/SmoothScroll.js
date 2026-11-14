"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

// Smooth scrolling for long marketing pages only; app screens keep native scroll.
export default function SmoothScroll({ children }) {
  const reduce = useReducedMotion();
  if (reduce) return children;
  return (
    <ReactLenis root options={{ lerp: 0.12, smoothWheel: true, anchors: true }}>
      {children}
    </ReactLenis>
  );
}
