"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface LiveIndicatorProps {
  isLive: boolean;
  label?: string;
  className?: string;
}

export default function LiveIndicator({ isLive, label, className }: LiveIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        isLive
          ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
          : "bg-accent-orange/10 text-accent-orange border border-accent-orange/20",
        className
      )}
    >
      <motion.span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isLive ? "bg-accent-green" : "bg-accent-orange"
        )}
        animate={isLive ? { scale: [1, 1.4, 1] } : {}}
        transition={isLive ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
      />
      {label ?? (isLive ? "Live" : "Stale")}
    </div>
  );
}
