"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tooltip } from "@/components/ui/Tooltip";
import AnimatedNumber from "./AnimatedNumber";
import Skeleton from "./Skeleton";

interface MetricCardProps {
  label: string;
  value: number | string;
  delta?: number;
  deltaLabel?: string;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  icon?: React.ElementType;
  sparklineData?: number[];
  tooltip?: string;
  className?: string;
}

function SparkLine({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "var(--color-accent-green)" : "var(--color-accent-red)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  prefix,
  suffix,
  loading = false,
  icon: Icon,
  sparklineData,
  tooltip,
  className,
}: MetricCardProps) {
  const prevValueRef = useRef<number | string>(value);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (prevValueRef.current !== value && !loading) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 600);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value, loading]);

  if (loading) {
    return (
      <div
        className={cn(
          "bg-bg-card rounded-xl border border-border-default p-5",
          className
        )}
      >
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "bg-bg-card rounded-xl border border-border-default p-5 hover:border-border-hover hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)] transition-all duration-200 relative",
        isFlashing && "animate-value-flash",
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div className="absolute top-5 right-5">
          <Icon size={18} className="text-text-muted" />
        </div>
      )}

      {/* Label */}
      <p className="text-text-secondary text-sm mb-1">
        {label}
        {tooltip && (
          <Tooltip content={tooltip}>
            <span className="inline-flex ml-1 cursor-help align-middle">
              <Info size={12} className="text-text-muted" />
            </span>
          </Tooltip>
        )}
      </p>

      {/* Value */}
      <div className="text-2xl font-bold font-mono text-text-primary mb-2">
        {typeof value === "number" ? (
          <AnimatedNumber
            value={value}
            prefix={prefix}
            suffix={suffix}
          />
        ) : (
          <span>
            {prefix}
            {value}
            {suffix}
          </span>
        )}
      </div>

      {/* Delta + SparkLine row */}
      <div className="flex items-center justify-between">
        {delta !== undefined ? (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                delta >= 0
                  ? "bg-accent-green/15 text-accent-green"
                  : "bg-accent-red/15 text-accent-red"
              )}
            >
              {delta >= 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(2)}%
            </span>
            {deltaLabel && (
              <span className="text-text-muted text-xs">{deltaLabel}</span>
            )}
          </div>
        ) : (
          <div />
        )}

        {sparklineData && sparklineData.length > 1 && (
          <SparkLine data={sparklineData} />
        )}
      </div>
    </motion.div>
  );
}
