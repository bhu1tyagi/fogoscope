"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { notify } from "@/lib/notifications";

type TestState = "idle" | "testing" | "complete";

const MAX_MS = 500;

function getColor(ms: number) {
  if (ms < 50) return "#22c55e";
  if (ms < 100) return "#06b6d4";
  if (ms < 200) return "#f97316";
  return "#ef4444";
}

function normalize(ms: number) {
  return Math.min(Math.max(ms, 0), MAX_MS) / MAX_MS;
}

// Simple semicircle (180°) arc from left to right
// viewBox is 200x110 — just the top half of a circle centered at (100, 100)
const CX = 100;
const CY = 100;
const R = 80;
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const ARC_LEN = Math.PI * R; // half circumference

export default function SpeedTest() {
  const [state, setState] = useState<TestState>("idle");
  const [latency, setLatency] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const prevLatencyRef = useRef(0);
  const [hasRun, setHasRun] = useState(false);

  const runTest = async () => {
    setState("testing");
    prevLatencyRef.current = latency;
    const results: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try {
        await fetch("https://mainnet.fogo.io", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot", params: [] }),
        });
      } catch {
        // Even failed requests measure latency
      }
      results.push(performance.now() - start);
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    setLatency(avg);
    setHistory((prev) => [...prev.slice(-9), avg]);
    setHasRun(true);
    setState("complete");
    notify.speedTest(avg);
  };

  const color = state === "complete" ? getColor(latency) : "#475569";
  const progress = state === "complete" ? normalize(latency) : 0;

  return (
    <div className="bg-bg-card rounded-xl border border-border-default p-5 flex flex-col items-center gap-4">
      {/* Title */}
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Zap size={16} className="text-accent-cyan" />
        Live Speed Test
      </h3>

      {/* Gauge — self-contained, no overflow */}
      <div className="relative w-[220px] h-[120px]">
        <svg width="220" height="120" viewBox="-10 -10 220 120">
          {/* Background arc */}
          <path d={ARC_PATH} fill="none" stroke="#1e293b" strokeWidth={14} strokeLinecap="round" />

          {/* Color zone hints (subtle) */}
          {[
            { start: 0, end: 0.1, c: "#22c55e" },
            { start: 0.1, end: 0.2, c: "#06b6d4" },
            { start: 0.2, end: 0.4, c: "#f97316" },
            { start: 0.4, end: 1.0, c: "#ef4444" },
          ].map((z) => (
            <path
              key={z.start}
              d={ARC_PATH}
              fill="none"
              stroke={z.c}
              strokeWidth={14}
              strokeLinecap="butt"
              strokeDasharray={ARC_LEN}
              strokeDashoffset={-z.start * ARC_LEN}
              opacity={0.08}
              style={{ clipPath: `inset(0 ${(1 - z.end) * 100}% 0 ${z.start * 100}%)` }}
            />
          ))}

          {/* Filled progress arc */}
          {state !== "idle" && (
            <motion.path
              d={ARC_PATH}
              fill="none"
              stroke={color}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              initial={{ strokeDashoffset: ARC_LEN }}
              animate={{
                strokeDashoffset:
                  state === "testing"
                    ? ARC_LEN * 0.5
                    : ARC_LEN * (1 - progress),
              }}
              transition={
                state === "testing"
                  ? { duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }
                  : { duration: 0.8, ease: "easeOut" }
              }
            />
          )}

          {/* Tick marks */}
          {[0, 100, 200, 300, 500].map((val) => {
            const frac = val / MAX_MS;
            const angle = Math.PI * (1 - frac); // 180° to 0°
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x1 = CX + (R + 8) * cos;
            const y1 = CY - (R + 8) * sin;
            const x2 = CX + (R - 2) * cos;
            const y2 = CY - (R - 2) * sin;
            const lx = CX + (R + 20) * cos;
            const ly = CY - (R + 20) * sin;
            return (
              <g key={val}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth={1.5} />
                <text
                  x={lx} y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#64748b"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center value display */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-center">
          <AnimatePresence mode="wait">
            {state === "complete" ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-2xl font-bold font-mono"
                style={{ color }}
              >
                <CountUp
                  start={prevLatencyRef.current}
                  end={Math.round(latency)}
                  duration={0.8}
                  suffix="ms"
                />
              </motion.div>
            ) : state === "testing" ? (
              <motion.div
                key="testing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-text-muted font-medium animate-pulse"
              >
                Measuring...
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-text-muted"
              >
                Ready
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={runTest}
        disabled={state === "testing"}
        className={cn(
          "relative z-10 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          state === "testing"
            ? "bg-bg-sidebar text-text-muted cursor-not-allowed"
            : "bg-accent-cyan text-black hover:bg-accent-cyan/90 active:scale-95"
        )}
      >
        {state === "testing" ? "Running..." : hasRun ? "Test Again" : "Run Speed Test"}
      </button>

      {/* History sparkline */}
      {history.length > 1 && (
        <div className="w-full">
          <p className="text-[10px] text-text-muted mb-1 text-center">Recent tests</p>
          <div className="flex justify-center">
            <svg width={history.length * 28} height={36}>
              <polyline
                points={history.map((v, i) => `${i * 28 + 14},${32 - normalize(v) * 28}`).join(" ")}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {history.map((v, i) => (
                <circle key={i} cx={i * 28 + 14} cy={32 - normalize(v) * 28} r={3} fill={getColor(v)} />
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Info text */}
      <div className="text-center">
        {hasRun ? (
          <div className="space-y-0.5">
            <p className="text-[11px] text-text-muted">
              Your round-trip to Fogo RPC:{" "}
              <span className="font-mono font-medium" style={{ color: getColor(latency) }}>
                {Math.round(latency)}ms
              </span>
            </p>
            <p className="text-[10px] text-text-muted/70">
              Measures network latency from your browser — Fogo confirms blocks in ~40ms on-chain regardless.
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-text-muted/70">
            Measures round-trip time from your browser to Fogo&apos;s mainnet RPC.
          </p>
        )}
      </div>
    </div>
  );
}
