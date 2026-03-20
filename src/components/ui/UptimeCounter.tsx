"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LiveIndicator from "./LiveIndicator";

interface UptimeCounterProps {
  streakBlocks: number;
  streakActive: boolean;
}

function FlipDigit({ digit }: { digit: string }) {
  return (
    <div className="relative w-8 h-11 sm:w-10 sm:h-13 bg-bg-primary rounded-lg border border-border-default overflow-hidden" style={{ perspective: "200px" }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={digit}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl font-bold font-mono text-text-primary"
        >
          {digit}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  const digits = String(value).padStart(2, "0").split("");
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-0.5">
        {digits.map((d, i) => (
          <FlipDigit key={`${label}-${i}`} digit={d} />
        ))}
      </div>
      <span className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function UptimeCounter({ streakBlocks, streakActive }: UptimeCounterProps) {
  // Base duration from the API (streakBlocks * ~40ms per block)
  const baseSeconds = Math.floor((streakBlocks * 40) / 1000);

  // Local tick counter that adds seconds between API refreshes.
  // Resets to 0 every time streakBlocks changes (i.e. API delivers new data).
  const [tickOffset, setTickOffset] = useState(0);
  const prevBlocksRef = useRef(streakBlocks);

  useEffect(() => {
    // When the API delivers a new streak count, reset the local tick
    if (streakBlocks !== prevBlocksRef.current) {
      prevBlocksRef.current = streakBlocks;
      setTickOffset(0);
    }
  }, [streakBlocks]);

  useEffect(() => {
    if (!streakActive) return;
    const interval = setInterval(() => {
      setTickOffset((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [streakActive]);

  const totalSeconds = baseSeconds + tickOffset;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="bg-bg-card rounded-xl border border-border-default p-5 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Sub-50ms Streak</h3>
        {streakActive && <LiveIndicator isLive={true} label="LIVE" />}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <TimeUnit value={days} label="Days" />
        <span className="text-lg font-bold text-text-muted mt-[-14px]">:</span>
        <TimeUnit value={hours} label="Hrs" />
        <span className="text-lg font-bold text-text-muted mt-[-14px]">:</span>
        <TimeUnit value={minutes} label="Min" />
        <span className="text-lg font-bold text-text-muted mt-[-14px]">:</span>
        <TimeUnit value={seconds} label="Sec" />
      </div>

      <p className="text-xs text-text-muted text-center">
        <span className="font-mono font-medium text-accent-cyan">{streakBlocks.toLocaleString()}</span>{" "}
        consecutive blocks under 50ms
      </p>
    </div>
  );
}
