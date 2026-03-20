"use client";

import { motion } from "framer-motion";

interface AnimationProps {
  size?: number;
  className?: string;
}

export function ShieldAnimation({ size = 120, className }: AnimationProps) {
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
      {/* Shield body */}
      <motion.path
        d="M60 10 L100 30 L100 60 C100 85 80 105 60 115 C40 105 20 85 20 60 L20 30 Z"
        stroke="#22c55e"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      {/* Shield fill */}
      <motion.path
        d="M60 10 L100 30 L100 60 C100 85 80 105 60 115 C40 105 20 85 20 60 L20 30 Z"
        fill="#22c55e"
        initial={{ fillOpacity: 0 }}
        animate={{ fillOpacity: 0.08 }}
        transition={{ delay: 1, duration: 0.5 }}
      />
      {/* Checkmark */}
      <motion.path
        d="M42 62 L54 74 L78 50"
        stroke="#06b6d4"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.2, duration: 0.6, ease: "easeOut" }}
      />
      {/* Glow pulse */}
      <motion.circle
        cx={60}
        cy={62}
        r={35}
        fill="none"
        stroke="#22c55e"
        strokeWidth={1}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.3, 0], scale: [0.8, 1.2, 0.8] }}
        transition={{ delay: 2, duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}
