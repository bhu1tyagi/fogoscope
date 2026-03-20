"use client";

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { TooltipPayloadEntry } from "recharts/types/state/tooltipSlice";
import { cn } from "@/lib/utils/cn";
import Skeleton from "@/components/ui/Skeleton";

interface DataKey {
  key: string;
  color: string;
  name: string;
}

interface AreaChartProps {
  data: Record<string, unknown>[];
  dataKeys: DataKey[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  gradientFill?: boolean;
  loading?: boolean;
  className?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border-default bg-[#111827] px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-text-muted">{label}</p>
      {payload.map((entry: TooltipPayloadEntry) => (
        <p
          key={String(entry.name)}
          className="text-xs font-medium"
          style={{ color: entry.color }}
        >
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : String(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function AreaChart({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = false,
  gradientFill = true,
  loading = false,
  className,
}: AreaChartProps) {
  if (loading) {
    return (
      <div className={cn(className)} style={{ height }}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className={cn(className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data}>
          {gradientFill && (
            <defs>
              {dataKeys.map((dk) => (
                <linearGradient
                  key={dk.key}
                  id={`gradient-${dk.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={dk.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={dk.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
          )}

          {showGrid && (
            <CartesianGrid
              stroke="#1e293b"
              strokeDasharray="3 3"
              vertical={false}
            />
          )}

          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "#1e293b" }}
            tickLine={{ stroke: "#1e293b" }}
          />

          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "#1e293b" }}
            tickLine={{ stroke: "#1e293b" }}
            width={60}
          />

          <Tooltip content={CustomTooltip} cursor={{ stroke: "rgba(6, 182, 212, 0.3)", strokeWidth: 1, strokeDasharray: "4 4" }} />

          {showLegend && (
            <Legend
              wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
            />
          )}

          {dataKeys.map((dk) => (
            <Area
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stroke={dk.color}
              strokeWidth={2}
              fill={
                gradientFill ? `url(#gradient-${dk.key})` : dk.color
              }
              fillOpacity={gradientFill ? 1 : 0.1}
              dot={false}
              activeDot={{ r: 4, fill: dk.color, stroke: "#111827", strokeWidth: 2 }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AreaChart;
