"use client";

import { useMemo } from "react";
import { Shield, AlertTriangle, Zap, Eye } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import MetricCard from "@/components/ui/MetricCard";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import Skeleton from "@/components/ui/Skeleton";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { useMEV } from "@/hooks/useMEV";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, shortenAddress, timeAgo } from "@/lib/utils/formatters";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";
import ShareButton from "@/components/ui/ShareButton";
import { ShieldAnimation } from "@/components/animations";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HeatmapCell({ count }: { count: number }) {
  const bg =
    count === 0
      ? "bg-accent-green/10"
      : count <= 2
        ? "bg-accent-orange/30"
        : "bg-accent-red/50";

  return (
    <div
      className={cn("w-full aspect-square rounded-sm", bg)}
      title={`${count} event${count !== 1 ? "s" : ""}`}
    />
  );
}

function ScoreRing({ score, size = 200 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const scoreColor =
    score >= 90 ? "#22c55e" : score >= 70 ? "#06b6d4" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <span className="text-5xl font-bold font-mono" style={{ color: scoreColor }}>
            <AnimatedNumber value={score} decimals={0} />
          </span>
          <span className="text-xl font-medium text-text-muted">/100</span>
        </div>
        <span className="text-xs text-text-secondary mt-2 uppercase tracking-widest">
          MEV Protection
        </span>
      </div>
    </div>
  );
}

const eventColumns = [
  {
    key: "timestamp",
    label: "Time",
    sortable: true,
    render: (value: unknown) =>
      value ? timeAgo(new Date(value as string)) : "\u2014",
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (value: unknown) => {
      const typeMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
        sandwich: { label: "Sandwich", variant: "danger" },
        frontrun: { label: "Frontrun", variant: "warning" },
        arbitrage: { label: "Arbitrage", variant: "info" },
        oracle_deviation: { label: "Oracle Dev", variant: "warning" },
        none_detected: { label: "None", variant: "success" },
      };
      const t = typeMap[value as string] ?? { label: String(value), variant: "default" as const };
      return <Badge variant={t.variant}>{t.label}</Badge>;
    },
  },
  {
    key: "severity",
    label: "Severity",
    sortable: true,
    render: (value: unknown) => {
      const sevMap: Record<string, "success" | "warning" | "danger" | "default"> = {
        none: "success",
        low: "default",
        medium: "warning",
        high: "danger",
      };
      return (
        <Badge variant={sevMap[value as string] ?? "default"}>
          {String(value)}
        </Badge>
      );
    },
  },
  {
    key: "relatedTxs",
    label: "Related Txs",
    align: "right" as const,
    render: (value: unknown) =>
      Array.isArray(value) ? value.length : 0,
  },
  {
    key: "estimatedProfit",
    label: "Est. Profit",
    sortable: true,
    align: "right" as const,
    render: (value: unknown) =>
      value != null ? formatCurrency(value as number) : "\u2014",
  },
  {
    key: "victimWallet",
    label: "Victim",
    render: (value: unknown) =>
      value ? (
        <a
          href={`https://fogoscan.com/address/${value as string}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-text-secondary hover:text-accent-cyan transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {shortenAddress(value as string)}
        </a>
      ) : "\u2014",
  },
];

export default function MEVPage() {
  const { data: mevData, isLoading } = useMEV();

  const heatmapGrid = useMemo(() => {
    if (!mevData?.heatmap) return null;

    // Build a lookup: day -> hour -> count
    const lookup = new Map<string, number>();
    for (const cell of mevData.heatmap) {
      lookup.set(`${cell.day}-${cell.hour}`, cell.count);
    }

    return DAY_NAMES.map((dayName, dayIdx) => ({
      dayName,
      hours: HOURS.map((hour) => ({
        hour,
        count: lookup.get(`${dayIdx}-${hour}`) ?? 0,
      })),
    }));
  }, [mevData?.heatmap]);

  const eventRows = useMemo(() => {
    if (!mevData?.events) return [];
    return mevData.events.map((e) => ({
      ...e,
    })) as unknown as Record<string, unknown>[];
  }, [mevData?.events]);

  return (
    <PageWrapper
      title="MEV Transparency"
      description="Proving Fogo's execution fairness through MEV analysis"
    >
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="bg-bg-card rounded-2xl p-8 text-center border border-border-default">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-[180px] w-[180px] rounded-full" />
              <Skeleton className="h-5 w-64" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ScoreRing score={mevData?.score ?? 0} />

              {/* Positive messaging when score is high */}
              {(mevData?.score ?? 0) >= 95 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent-green/10 border border-accent-green/20">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    Fair ordering active &mdash; MEV extraction near zero
                  </span>
                </div>
              )}

              <p className="text-text-secondary text-sm max-w-md">
                On Fogo,{" "}
                <span className="text-accent-cyan font-semibold">
                  {mevData?.fogoMevPercent ?? 0}%
                </span>{" "}
                of trades are affected by MEV. On Solana:{" "}
                <span className="text-purple-400 font-semibold">
                  {mevData?.solanaMevPercent ?? 0}%
                </span>
              </p>
            </div>
          )}
        </div>

        <ShareButton
          title="Fogo MEV Transparency Report"
          metrics={[
            { label: "MEV Score", value: `${mevData?.score ?? 100}/100` },
            { label: "Sandwich Attacks", value: String(mevData?.sandwichCount ?? 0) },
            { label: "Frontrun Events", value: String(mevData?.frontrunCount ?? 0) },
          ]}
        />

        {/* Counter Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Sandwich Attacks"
            value={mevData?.sandwichCount ?? 0}
            loading={isLoading}
            icon={Shield}
            tooltip={METRIC_TOOLTIPS.sandwichCount}
          />
          <MetricCard
            label="Frontrun Events"
            value={mevData?.frontrunCount ?? 0}
            loading={isLoading}
            icon={AlertTriangle}
            tooltip={METRIC_TOOLTIPS.frontrunCount}
          />
          <MetricCard
            label="Arbitrage Events"
            value={mevData?.arbitrageCount ?? 0}
            loading={isLoading}
            icon={Zap}
            tooltip={METRIC_TOOLTIPS.arbitrageCount}
          />
          <MetricCard
            label="MEV Exposure"
            value={mevData?.fogoMevPercent ?? 0}
            suffix="%"
            loading={isLoading}
            icon={Eye}
            tooltip={METRIC_TOOLTIPS.mevExposure}
          />
        </div>

        {/* Positive badges when zero MEV detected */}
        {!isLoading && (mevData?.totalEvents24h ?? 0) === 0 && (
          <div className="-mt-4 ml-2 flex flex-wrap gap-2">
            <Badge variant="success">Zero Sandwich Attacks</Badge>
            <Badge variant="success">Zero Frontrunning</Badge>
            <Badge variant="success">Zero Harmful MEV</Badge>
          </div>
        )}

        {/* MEV Heatmap Section */}
        <ChartContainer
          title="MEV Activity Heatmap"
          subtitle="24 hours x 7 days &mdash; all green means zero MEV detected"
          loading={isLoading}
        >
          {heatmapGrid && (
            <div className="overflow-x-auto">
              {/* Hour labels */}
              <div className="flex items-center mb-1">
                <div className="w-10 shrink-0" />
                <div className="grid grid-cols-24 gap-0.5 flex-1" style={{ gridTemplateColumns: `repeat(24, minmax(0, 1fr))` }}>
                  {HOURS.map((h) => (
                    <span
                      key={h}
                      className="text-[10px] text-text-muted text-center"
                    >
                      {h % 3 === 0 ? h : ""}
                    </span>
                  ))}
                </div>
              </div>

              {/* Grid rows */}
              {heatmapGrid.map((row) => (
                <div key={row.dayName} className="flex items-center mb-0.5">
                  <span className="w-10 shrink-0 text-xs text-text-muted">
                    {row.dayName}
                  </span>
                  <div
                    className="grid gap-0.5 flex-1"
                    style={{ gridTemplateColumns: `repeat(24, minmax(0, 1fr))` }}
                  >
                    {row.hours.map((cell) => (
                      <HeatmapCell
                        key={`${row.dayName}-${cell.hour}`}
                        count={cell.count}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 justify-end">
                <span className="text-xs text-text-muted">Less</span>
                <div className="w-3 h-3 rounded-sm bg-accent-green/10" />
                <div className="w-3 h-3 rounded-sm bg-accent-orange/30" />
                <div className="w-3 h-3 rounded-sm bg-accent-red/50" />
                <span className="text-xs text-text-muted">More</span>
              </div>
            </div>
          )}
        </ChartContainer>

        {/* MEV Event Log */}
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            MEV Event Log
          </h2>
          {!isLoading && eventRows.length === 0 ? (
            <div className="bg-bg-card rounded-xl border border-border-default p-8 text-center">
              <ShieldAnimation size={60} />
              <p className="text-text-secondary text-sm">
                No MEV events detected in the last 24 hours.
              </p>
              <p className="text-text-muted text-xs mt-1">
                Fogo&apos;s fair ordering mechanism prevents sandwich attacks and frontrunning.
              </p>
            </div>
          ) : (
            <DataTable
              columns={eventColumns}
              data={eventRows}
              loading={isLoading}
              emptyMessage="No MEV events detected"
            />
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
