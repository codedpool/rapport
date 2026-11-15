"use client";

import { MotionConfig } from "motion/react";

// Respects the visitor's "reduce motion" setting for every Motion animation.
export default function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
