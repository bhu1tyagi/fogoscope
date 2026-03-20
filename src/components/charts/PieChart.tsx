"use client";

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { TooltipPayloadEntry } from "recharts/types/state/tooltipSlice";
import type { PieLabelRenderProps } from "recharts/types/polar/Pie";
import { cn } from "@/lib/utils/cn";
import Skeleton from "@/components/ui/Skeleton";

interface PieDataItem {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieDataItem[];
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  showLabels?: boolean;
  loading?: boolean;
  className?: string;
}

function CustomTooltip({
  active,
  payload,
}: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const entry: TooltipPayloadEntry = payload[0];
  const entryPayload = entry.payload as Record<string, unknown> | undefined;
  return (
    <div className="rounded-lg border border-border-default bg-[#111827] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium" style={{ color: (entryPayload?.color as string) ?? "#94a3b8" }}>
        {String(entry.name)}
      </p>
      <p className="text-xs text-text-secondary">
        {typeof entry.value === "number" ? entry.value.toLocaleString() : String(entry.value)}
      </p>
    </div>
  );
}

function renderCustomLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = props.midAngle ?? 0;
  const outerRadius = Number(props.outerRadius ?? 0);
  const name = String(props.name ?? "");
  const percent = props.percent ?? 0;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#94a3b8"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

export function PieChart({
  data,
  innerRadius = 60,
  outerRadius = 80,
  height = 250,
  showLabels = true,
  loading = false,
  className,
}: PieChartProps) {
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
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            nameKey="name"
            strokeWidth={0}
            label={showLabels ? renderCustomLabel : false}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={CustomTooltip} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PieChart;
