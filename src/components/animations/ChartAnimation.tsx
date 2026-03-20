"use client";

import { motion } from "framer-motion";

interface AnimationProps {
  size?: number;
  className?: string;
}

export function ChartAnimation({ size = 120, className }: AnimationProps) {
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
      {/* Grid lines */}
      {[30, 50, 70, 90].map((y, i) => (
        <motion.line
          key={y}
          x1={20}
          y1={y}
          x2={100}
          y2={y}
          stroke="#1e293b"
          strokeWidth={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        />
      ))}
      {/* Axis */}
      <motion.line x1={20} y1={20} x2={20} y2={100} stroke="#334155" strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
      <motion.line x1={20} y1={100} x2={105} y2={100} stroke="#334155" strokeWidth={1.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
      {/* Chart line */}
      <motion.polyline
        points="25,85 40,70 55,75 65,45 80,50 95,30"
        stroke="#06b6d4"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
      />
      {/* End dot */}
      <motion.circle
        cx={95}
        cy={30}
        r={4}
        fill="#06b6d4"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 2, duration: 0.3 }}
      />
      {/* Dot pulse */}
      <motion.circle
        cx={95}
        cy={30}
        r={4}
        fill="none"
        stroke="#06b6d4"
        strokeWidth={1}
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ delay: 2.3, duration: 2, repeat: Infinity }}
      />
    </motion.svg>
  );
}
