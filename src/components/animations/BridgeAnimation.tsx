"use client";

import { motion } from "framer-motion";

interface AnimationProps {
  size?: number;
  className?: string;
}

export function BridgeAnimation({ size = 120, className }: AnimationProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left circle */}
      <motion.circle cx={30} cy={60} r={18} stroke="#06b6d4" strokeWidth={2} fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
      {/* Right circle */}
      <motion.circle cx={90} cy={60} r={18} stroke="#a855f7" strokeWidth={2} fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
      {/* Arrow right */}
      <motion.g initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.8, repeat: Infinity, repeatType: "reverse", repeatDelay: 0.5 }}>
        <line x1={50} y1={52} x2={68} y2={52} stroke="#06b6d4" strokeWidth={2} strokeLinecap="round" />
        <polyline points="63,47 70,52 63,57" stroke="#06b6d4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </motion.g>
      {/* Arrow left */}
      <motion.g initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.2, duration: 0.8, repeat: Infinity, repeatType: "reverse", repeatDelay: 0.5 }}>
        <line x1={70} y1={68} x2={52} y2={68} stroke="#a855f7" strokeWidth={2} strokeLinecap="round" />
        <polyline points="57,63 50,68 57,73" stroke="#a855f7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </motion.g>
      {/* Labels */}
      <motion.text x={30} y={100} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="sans-serif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>Fogo</motion.text>
      <motion.text x={90} y={100} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="sans-serif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>Other</motion.text>
    </motion.svg>
  );
}
