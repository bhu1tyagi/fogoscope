"use client";

import { motion } from "framer-motion";

interface AnimationProps {
  size?: number;
  className?: string;
}

export function WalletSearchAnimation({ size = 120, className }: AnimationProps) {
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
      {/* Wallet body */}
      <motion.rect
        x={25}
        y={35}
        width={70}
        height={50}
        rx={8}
        stroke="#475569"
        strokeWidth={2}
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Wallet clasp */}
      <motion.rect
        x={70}
        y={50}
        width={25}
        height={20}
        rx={4}
        stroke="#475569"
        strokeWidth={2}
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />
      {/* Magnifying glass */}
      <motion.g
        animate={{ x: [0, 15, -10, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.circle
          cx={50}
          cy={60}
          r={14}
          stroke="#06b6d4"
          strokeWidth={2}
          fill="none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        />
        <motion.line
          x1={60}
          y1={70}
          x2={72}
          y2={82}
          stroke="#06b6d4"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.3, duration: 0.3 }}
        />
      </motion.g>
      {/* Scan line */}
      <motion.line
        x1={40}
        y1={58}
        x2={60}
        y2={58}
        stroke="#06b6d4"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ delay: 1.5, duration: 1.5, repeat: Infinity }}
      />
    </motion.svg>
  );
}
