"use client";

import { motion } from "motion/react";

// Used once, for the feedback preview: the one element below the fold worth drawing attention to.
// MotionConfig (reducedMotion="user") drops the movement for visitors who ask for less motion.
export default function Reveal({ children, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
