"use client";

import useReducedMotionSafe from "@/lib/useReducedMotionSafe";
import { ReactLenis } from "lenis/react";

// Smooth scrolling for long marketing pages only; app screens keep native scroll.
// The wrapper never changes, so turning it off for reduced motion doesn't re-render the page.
export default function SmoothScroll({ children }) {
  const reduce = useReducedMotionSafe();
  return (
    <ReactLenis root options={{ lerp: reduce ? 1 : 0.12, smoothWheel: !reduce, anchors: true }}>
      {children}
    </ReactLenis>
  );
}
