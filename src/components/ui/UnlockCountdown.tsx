"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tooltip } from "@/components/ui/Tooltip";

const UNLOCK_DATE = new Date("2026-09-26T00:00:00Z");
const TOTAL_SUPPLY = 10_000_000_000;

const ALLOCATIONS = [
  { label: "Core Contributors", percent: 34, color: "#06b6d4", locked: true },
  { label: "Foundation", percent: 21.76, color: "#3b82f6", locked: false },
  { label: "Institutional", percent: 12.06, color: "#8b5cf6", locked: true },
  { label: "Echo", percent: 8.68, color: "#f59e0b", locked: true },
  { label: "Advisors", percent: 7, color: "#ef4444", locked: true },
  { label: "Launch Liquidity", percent: 6.5, color: "#22c55e", locked: false },
  { label: "Airdrop", percent: 6, color: "#ec4899", locked: false },
  { label: "Binance Sale", percent: 2, color: "#f97316", locked: false },
  { label: "Burned", percent: 2, color: "#475569", locked: true },
] as const;

interface UnlockCountdownProps {
  fogoPrice?: number;
}

function FlipDigit({ digit }: { digit: string }) {
  return (
    <div className="relative w-9 h-12 sm:w-11 sm:h-14 bg-bg-card rounded-lg border border-border-default overflow-hidden" style={{ perspective: "200px" }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={digit}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center text-xl sm:text-2xl font-bold font-mono text-text-primary"
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
      <span className="text-[10px] sm:text-xs text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function UnlockCountdown({ fogoPrice }: UnlockCountdownProps) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = Math.max(0, UNLOCK_DATE.getTime() - now.getTime());
      const totalSeconds = Math.floor(diff / 1000);
      setTime({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const lockedPercent = ALLOCATIONS.filter((a) => a.locked).reduce((s, a) => s + a.percent, 0);
  const unlockedPercent = ALLOCATIONS.filter((a) => !a.locked).reduce((s, a) => s + a.percent, 0);

  return (
    <div className="bg-bg-card rounded-xl border border-border-default p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-accent-cyan" />
        <h3 className="text-sm font-semibold text-text-primary">FOGO Token Unlock Cliff</h3>
        <span className="text-xs text-text-muted">September 26, 2026</span>
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-5">
        <TimeUnit value={time.days} label="Days" />
        <span className="text-xl font-bold text-text-muted mt-[-16px]">:</span>
        <TimeUnit value={time.hours} label="Hours" />
        <span className="text-xl font-bold text-text-muted mt-[-16px]">:</span>
        <TimeUnit value={time.minutes} label="Min" />
        <span className="text-xl font-bold text-text-muted mt-[-16px]">:</span>
        <TimeUnit value={time.seconds} label="Sec" />
      </div>

      {/* Allocation Bar */}
      <div className="flex w-full h-3 rounded-full overflow-hidden mb-3">
        {ALLOCATIONS.map((a) => (
          <Tooltip
            key={a.label}
            content={`${a.label}: ${a.percent}% (${((TOTAL_SUPPLY * a.percent) / 100).toLocaleString()} FOGO)${fogoPrice ? ` ≈ $${(((TOTAL_SUPPLY * a.percent) / 100) * fogoPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ""}${a.locked ? " — Locked until cliff" : " — Unlocked"}`}
            side="top"
          >
            <div
              style={{ width: `${a.percent}%`, background: a.color }}
              className={cn(
                "h-full transition-all duration-200 hover:brightness-125 cursor-pointer",
                a.locked && "opacity-60"
              )}
            />
          </Tooltip>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
        {ALLOCATIONS.map((a) => (
          <div key={a.label} className="flex items-center gap-1.5">
            <div
              className={cn("w-2 h-2 rounded-full", a.locked && "opacity-60")}
              style={{ background: a.color }}
            />
            <span className="text-[10px] text-text-muted">
              {a.label} ({a.percent}%)
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Unlock size={12} className="text-accent-green" />
          <span>{unlockedPercent.toFixed(1)}% circulating</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock size={12} className="text-accent-cyan" />
          <span>{lockedPercent.toFixed(1)}% unlocks on cliff date</span>
        </div>
      </div>
    </div>
  );
}
