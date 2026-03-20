"use client";

import { cn } from "@/lib/utils/cn";

interface TickerItem {
  pair: string;
  price: number;
  change: number;
}

interface LiveTickerProps {
  items: TickerItem[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price);
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

export default function LiveTicker({ items }: LiveTickerProps) {
  // Duplicate items for seamless looping
  const duplicated = [...items, ...items];

  return (
    <div className="h-8 bg-bg-card border-b border-border-default overflow-hidden relative">
      <div className="flex items-center h-full animate-ticker whitespace-nowrap">
        {duplicated.map((item, i) => (
          <div
            key={`${item.pair}-${i}`}
            className="inline-flex items-center gap-2 px-2 md:px-4 text-xs md:text-sm font-mono shrink-0"
          >
            <span className="text-text-secondary">{item.pair}</span>
            <span className="text-text-primary tabular-nums">
              {formatPrice(item.price)}
            </span>
            <span
              className={cn(
                "tabular-nums",
                item.change >= 0 ? "text-accent-green" : "text-accent-red"
              )}
            >
              {formatChange(item.change)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
