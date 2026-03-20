"use client";

import { cn } from "@/lib/utils/cn";

interface ChainHealthBadgeProps {
  status: "healthy" | "degraded" | "down";
  label?: string;
  latency?: number;
}

const statusConfig = {
  healthy: {
    dotClass: "bg-accent-green animate-pulse",
    textClass: "text-accent-green",
  },
  degraded: {
    dotClass: "bg-accent-orange",
    textClass: "text-accent-orange",
  },
  down: {
    dotClass: "bg-accent-red",
    textClass: "text-accent-red",
  },
} as const;

export default function ChainHealthBadge({
  status,
  label = "Fogo Mainnet",
  latency,
}: ChainHealthBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-card px-3 py-1.5"
      title={latency !== undefined ? `Latency: ${latency}ms` : undefined}
    >
      <span
        className={cn("h-2 w-2 rounded-full", config.dotClass)}
      />
      <span className={cn("text-xs font-medium", config.textClass)}>
        {label}
      </span>
      {latency !== undefined && (
        <span className="text-xs text-text-muted font-mono tabular-nums">
          {latency}ms
        </span>
      )}
    </div>
  );
}
