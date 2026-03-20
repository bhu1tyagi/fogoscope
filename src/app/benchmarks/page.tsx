"use client";

import { useMemo } from "react";
import { useBenchmarks } from "@/hooks/useBenchmarks";
import { PageWrapper } from "@/components/layout/PageWrapper";
import MetricCard from "@/components/ui/MetricCard";
import SpeedTest from "@/components/ui/SpeedTest";
import UptimeCounter from "@/components/ui/UptimeCounter";
import ShareButton from "@/components/ui/ShareButton";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BlockTimeConsistency } from "@/components/charts/BlockTimeConsistency";
import Badge from "@/components/ui/Badge";
import { THEME } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";

export default function BenchmarksPage() {
  const { data, isLoading } = useBenchmarks();

  const solanaBlockTime = useMemo(() => {
    const solana = data?.chains?.find((c) => c.chain === "Solana");
    return solana?.blockTimeMs ?? 400;
  }, [data]);

  const speedMultiplier = useMemo(() => {
    if (!data?.currentBlockTimeMs || data.currentBlockTimeMs === 0) return 0;
    return Math.round(solanaBlockTime / data.currentBlockTimeMs);
  }, [data, solanaBlockTime]);

  const ethMultiplier = useMemo(() => {
    if (!data?.currentBlockTimeMs || data.currentBlockTimeMs === 0) return 0;
    return Math.round(12000 / data.currentBlockTimeMs);
  }, [data]);

  return (
    <PageWrapper title="Performance Benchmarks" description="Live speed metrics proving Fogo's execution advantage">
      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-bg-card rounded-xl border border-border-default p-6 sm:p-8 text-center">
          <p className="text-text-secondary text-sm mb-2">Fogo is producing blocks every</p>
          <div className="text-4xl sm:text-5xl font-bold font-mono text-accent-cyan mb-3">
            <AnimatedNumber value={data?.currentBlockTimeMs ?? 40} suffix="ms" decimals={0} />
          </div>
          <p className="text-text-muted text-sm">
            That&apos;s <span className="text-accent-cyan font-semibold">{speedMultiplier}x faster</span> than Solana
            {" "}and <span className="text-accent-cyan font-semibold">{ethMultiplier}x faster</span> than Ethereum
          </p>
        </div>

        {/* Speed Test + Uptime Counter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SpeedTest />
          <UptimeCounter
            streakBlocks={data?.sub50msStreak ?? 0}
            streakActive={data?.sub50msStreakActive ?? false}
          />
        </div>

        {/* Block Time Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Avg Block Time (24h)"
            value={data?.avg24hBlockTimeMs ?? 0}
            suffix=" ms"
            loading={isLoading}
            tooltip={METRIC_TOOLTIPS.blockTime}
          />
          <MetricCard
            label="Min Block Time (24h)"
            value={data?.min24hBlockTimeMs ?? 0}
            suffix=" ms"
            loading={isLoading}
          />
          <MetricCard
            label="Max Block Time (24h)"
            value={data?.max24hBlockTimeMs ?? 0}
            suffix=" ms"
            loading={isLoading}
          />
          <MetricCard
            label="Sub-50ms Streak"
            value={data?.sub50msStreak ? data.sub50msStreak.toLocaleString() : "0"}
            suffix=" blocks"
            loading={isLoading}
          />
        </div>

        {/* Block Time Consistency Chart */}
        <ChartContainer title="Block Time Consistency (24h)" live>
          <BlockTimeConsistency
            data={data?.blockTimeHistory ?? []}
            loading={isLoading}
          />
        </ChartContainer>

        {/* Chain Comparison Table */}
        <div className="bg-bg-card rounded-xl border border-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-border-default">
            <h3 className="text-sm font-medium text-text-secondary">Performance Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-sidebar text-xs text-text-muted uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Chain</th>
                  <th className="px-4 py-3 text-right font-medium">Block Time</th>
                  <th className="px-4 py-3 text-right font-medium">TPS</th>
                  <th className="px-4 py-3 text-right font-medium">Finality</th>
                  <th className="px-4 py-3 text-right font-medium">Validators</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border-default">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 w-16 bg-bg-sidebar rounded animate-shimmer" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : (data?.chains ?? []).map((chain) => (
                      <tr
                        key={chain.chain}
                        className={cn(
                          "border-b border-border-default text-sm",
                          chain.chain === "Fogo" && "bg-accent-cyan/5 border-l-2 border-l-accent-cyan"
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {chain.chain}
                          {chain.live && (
                            <Badge variant="info" className="ml-2 text-[10px]">LIVE</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-primary">
                          {chain.blockTimeMs < 1000
                            ? `${Math.round(chain.blockTimeMs)}ms`
                            : `${(chain.blockTimeMs / 1000).toFixed(1)}s`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-primary">
                          {chain.tps.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {chain.finality}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-text-secondary">
                          {chain.validators.toLocaleString()}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Share */}
        <div className="flex justify-center">
          <ShareButton
            title="Fogo Speed Report"
            metrics={[
              { label: "Block Time", value: `${Math.round(data?.currentBlockTimeMs ?? 40)}ms` },
              { label: "vs Solana", value: `${speedMultiplier}x faster` },
              { label: "vs Ethereum", value: `${ethMultiplier}x faster` },
            ]}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
