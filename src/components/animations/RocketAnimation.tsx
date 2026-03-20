"use client";

import { motion } from "framer-motion";

interface AnimationProps {
  size?: number;
  className?: string;
}

export function RocketAnimation({ size = 120, className }: AnimationProps) {
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
      {/* Rocket body */}
      <motion.g
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Body */}
        <motion.path
          d="M60 20 C60 20 45 40 45 65 L55 75 L65 75 L75 65 C75 40 60 20 60 20Z"
          stroke="#06b6d4"
          strokeWidth={2}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2 }}
        />
        {/* Window */}
        <motion.circle
          cx={60}
          cy={48}
          r={6}
          stroke="#06b6d4"
          strokeWidth={1.5}
          fill="none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        />
        {/* Left fin */}
        <motion.path
          d="M45 60 L35 75 L45 70"
          stroke="#06b6d4"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        />
        {/* Right fin */}
        <motion.path
          d="M75 60 L85 75 L75 70"
          stroke="#06b6d4"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        />
      </motion.g>
      {/* Flame */}
      <motion.path
        d="M55 75 L60 95 L65 75"
        stroke="#f97316"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{
          d: [
            "M55 75 L60 95 L65 75",
            "M55 75 L60 90 L65 75",
            "M55 75 L60 95 L65 75",
          ],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
      {/* Particles */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={55 + i * 5}
          cy={88}
          r={1.5}
          fill="#f97316"
          animate={{
            y: [0, 15, 30],
            opacity: [0.8, 0.4, 0],
            x: [(i - 1) * 2, (i - 1) * 4, (i - 1) * 6],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.svg>
  );
}
