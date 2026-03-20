"use client";

import { useMemo } from "react";
import { Activity, Clock, Users, RefreshCw, Hash } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import MetricCard from "@/components/ui/MetricCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { TVChart } from "@/components/charts/TVChartDynamic";
import { useNetwork } from "@/hooks/useNetwork";
import { cn } from "@/lib/utils/cn";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";
import { useValidators } from "@/hooks/useValidators";
import { ValidatorPerformance } from "@/components/charts/ValidatorPerformance";
import * as Tabs from "@radix-ui/react-tabs";

/* ---------- helpers ---------- */

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `~${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}K`;
  return `~${n}`;
}

function formatBlockTime(ms: number): string {
  if (ms >= 60_000) return `~${(ms / 60_000).toFixed(0)}min`;
  if (ms >= 1_000) return `~${(ms / 1_000).toFixed(0)}s`;
  return `~${ms.toFixed(0)}ms`;
}

/* ---------- page ---------- */

export default function NetworkPage() {
  const { data, isLoading } = useNetwork();
  const { data: validatorData, isLoading: validatorsLoading } = useValidators();

  return (
    <PageWrapper
      title="Network Performance"
      description="Real-time Fogo chain health metrics"
    >
      {/* Live Indicators Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Current TPS"
          value={data?.currentTps ?? 0}
          icon={Activity}
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.currentTps}
        />
        <MetricCard
          label="Block Time"
          value={data?.avgBlockTimeMs ?? 0}
          suffix="ms"
          icon={Clock}
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.networkBlockTime}
        />
        <MetricCard
          label="Active Validators"
          value={data?.activeValidators ?? 0}
          icon={Users}
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.validators}
        />

        {/* Epoch card with progress bar */}
        <div className="relative">
          <MetricCard
            label="Epoch"
            value={data?.currentEpoch ?? 0}
            icon={RefreshCw}
            loading={isLoading}
            tooltip={METRIC_TOOLTIPS.epoch}
          />
          {!isLoading && data && (
            <div className="absolute bottom-3 left-5 right-5">
              <div className="w-full h-1.5 bg-border-default rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-cyan rounded-full transition-all"
                  style={{ width: `${(data.epochProgress * 100).toFixed(1)}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted mt-0.5 text-right">
                {(data.epochProgress * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        <MetricCard
          label="Current Slot"
          value={data?.currentSlot ?? 0}
          icon={Hash}
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.currentSlot}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <ChartContainer title="TPS Over Time" loading={isLoading} live>
          <TVChart
            data={data?.tpsHistory ?? []}
            type="area"
            height={300}
            loading={isLoading}
          />
        </ChartContainer>

        <ChartContainer title="Block Time" loading={isLoading} live>
          <TVChart
            data={data?.blockTimeHistory ?? []}
            type="line"
            height={300}
            lineColor="#22c55e"
            loading={isLoading}
          />
        </ChartContainer>
      </div>

      {/* Network Comparison Table */}
      <div className="bg-bg-card rounded-xl border border-border-default mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-border-default">
          <h3 className="text-sm font-medium text-text-secondary">
            Network Comparison
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-sidebar">
                {["Chain", "TPS", "Block Time", "Finality", "Validators", "24h Txs"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-5 py-3 text-left text-text-secondary text-xs uppercase tracking-wider font-medium whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {(data?.chains ?? []).map((row) => (
                <tr
                  key={row.chain}
                  className={cn(
                    "border-b border-border-default text-sm transition-colors",
                    row.chain === "Fogo"
                      ? "bg-accent-cyan/5 border-l-2 border-l-accent-cyan"
                      : "hover:bg-bg-card-hover",
                  )}
                >
                  <td className="px-5 py-3 text-text-primary font-medium whitespace-nowrap">
                    {row.chain}
                    {row.live && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-accent-cyan/15 text-accent-cyan px-2 py-0.5 text-[10px] font-medium">
                        LIVE
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-primary font-mono whitespace-nowrap">
                    {formatCompact(row.tps)}
                  </td>
                  <td className="px-5 py-3 text-text-primary font-mono whitespace-nowrap">
                    {formatBlockTime(row.blockTimeMs)}
                  </td>
                  <td className="px-5 py-3 text-text-primary font-mono whitespace-nowrap">
                    {row.finality}
                  </td>
                  <td className="px-5 py-3 text-text-primary font-mono whitespace-nowrap">
                    {formatCompact(row.validators)}
                  </td>
                  <td className="px-5 py-3 text-text-primary font-mono whitespace-nowrap">
                    {formatCompact(row.txs24h)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validator Performance */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Validator Performance</h2>
        <ValidatorPerformance data={validatorData} loading={validatorsLoading} />
      </div>
    </PageWrapper>
  );
}
