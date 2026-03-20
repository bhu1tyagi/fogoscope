"use client";

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
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

interface BarChartProps {
  data: Record<string, unknown>[];
  dataKeys: DataKey[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
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

export function BarChart({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = false,
  loading = false,
  className,
}: BarChartProps) {
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
        <RechartsBarChart data={data}>
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

          <Tooltip content={CustomTooltip} cursor={{ fill: "rgba(30, 41, 59, 0.5)" }} />

          {showLegend && (
            <Legend
              wrapperStyle={{ color: "#94a3b8", fontSize: 12 }}
            />
          )}

          {dataKeys.map((dk) => (
            <Bar
              key={dk.key}
              dataKey={dk.key}
              name={dk.name}
              fill={dk.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BarChart;
