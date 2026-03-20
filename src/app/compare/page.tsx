"use client";

import { useMemo, useState, useCallback } from "react";
import { Check, Share2 } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Skeleton from "@/components/ui/Skeleton";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { TVChart } from "@/components/charts/TVChartDynamic";
import { useComparison } from "@/hooks/useComparison";
import { cn } from "@/lib/utils/cn";
import { formatBps, formatLatency, formatCurrency } from "@/lib/utils/formatters";
import ShareButton from "@/components/ui/ShareButton";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";

interface MetricDef {
  label: string;
  fogoKey: keyof NonNullable<ReturnType<typeof useComparison>["data"]>["fogo"];
  suffix?: string;
  decimals?: number;
  higherIsBetter?: boolean;
  format?: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { label: "Avg Slippage (bps)", fogoKey: "slippageBps", suffix: " bps", decimals: 1 },
  { label: "Confirmation Time (ms)", fogoKey: "confirmationMs", suffix: "ms", decimals: 0 },
  { label: "MEV Exposure (%)", fogoKey: "mevPercent", suffix: "%", decimals: 2 },
  { label: "Tx Success Rate (%)", fogoKey: "bestExecRate", suffix: "%", decimals: 1, higherIsBetter: true },
  { label: "Avg Priority Fee", fogoKey: "avgPriorityFee", decimals: 4, format: (v) => formatCurrency(v) },
  { label: "Block Time (ms)", fogoKey: "blockTimeMs", suffix: "ms", decimals: 0 },
  { label: "TPS", fogoKey: "tps", decimals: 0, higherIsBetter: true },
];

function FaceOffRow({
  label,
  fogoVal,
  solanaVal,
  suffix,
  decimals = 2,
  higherIsBetter = false,
  format,
}: {
  label: string;
  fogoVal: number;
  solanaVal: number;
  suffix?: string;
  decimals?: number;
  higherIsBetter?: boolean;
  format?: (v: number) => string;
}) {
  const fogoWins = higherIsBetter ? fogoVal >= solanaVal : fogoVal <= solanaVal;
  const solanaWins = !fogoWins;

  return (
    <div className="bg-bg-card rounded-lg p-4 border border-border-default">
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center">
        {/* Fogo value */}
        <div
          className={cn(
            "text-left flex items-center gap-2",
            fogoWins && "text-accent-green"
          )}
        >
          <span className="text-lg font-bold font-mono">
            {format ? (
              format(fogoVal)
            ) : (
              <AnimatedNumber value={fogoVal} decimals={decimals} suffix={suffix} />
            )}
          </span>
          {fogoWins && <Check size={16} className="text-accent-green shrink-0" />}
        </div>

        {/* Center label */}
        <p className="text-center text-sm text-text-secondary">{label}</p>

        {/* Solana value */}
        <div
          className={cn(
            "text-right flex items-center justify-end gap-2",
            solanaWins && "text-accent-green"
          )}
        >
          {solanaWins && <Check size={16} className="text-accent-green shrink-0" />}
          <span className="text-lg font-bold font-mono">
            {format ? (
              format(solanaVal)
            ) : (
              <AnimatedNumber value={solanaVal} decimals={decimals} suffix={suffix} />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const { data: comparison, isLoading } = useComparison();
  const [copied, setCopied] = useState(false);

  const fogoChartData = useMemo(() => {
    if (!comparison?.history) return [];
    return comparison.history.map((h) => ({
      time: h.time,
      value: h.fogoSlippage,
    }));
  }, [comparison?.history]);

  const solanaChartData = useMemo(() => {
    if (!comparison?.history) return [];
    return comparison.history.map((h) => ({
      time: h.time,
      value: h.solanaSlippage,
    }));
  }, [comparison?.history]);

  const handleShare = useCallback(() => {
    if (!comparison) return;
    const tweet = [
      "Fogo execution quality vs Solana (last 24h):",
      `\uD83D\uDCCA Slippage: ${formatBps(comparison.fogo.slippageBps)} vs ${formatBps(comparison.solana.slippageBps)}`,
      `\u26A1 Latency: ${formatLatency(comparison.fogo.confirmationMs)} vs ${formatLatency(comparison.solana.confirmationMs)}`,
      `\uD83D\uDEE1\uFE0F MEV: ${comparison.fogo.mevPercent}% vs ${comparison.solana.mevPercent}%`,
      "",
      "Data by @FogoScope",
    ].join("\n");
    navigator.clipboard.writeText(tweet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [comparison]);

  return (
    <PageWrapper
      title="Fogo vs Solana"
      description="Side-by-side execution quality comparison"
    >
      <div className="space-y-6">
        {/* Split Header */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent-cyan/10 rounded-xl p-6 border border-accent-cyan/20">
            <h2 className="text-2xl font-bold text-[#06b6d4]">Fogo</h2>
            <p className="text-text-secondary text-sm mt-1">
              SVM with fair ordering
            </p>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-6 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-[#9945FF]">Solana</h2>
            <p className="text-text-secondary text-sm mt-1">
              Mainnet baseline
            </p>
          </div>
        </div>

        {/* Face-off Metrics */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : comparison ? (
          <div className="space-y-3">
            {/* Column headers for clarity */}
            <div className="grid grid-cols-3 px-4">
              <p className="text-xs text-[#06b6d4] font-medium uppercase tracking-wider">
                Fogo
              </p>
              <p className="text-center text-xs text-text-muted font-medium uppercase tracking-wider">
                Metric
              </p>
              <p className="text-right text-xs text-[#9945FF] font-medium uppercase tracking-wider">
                Solana
              </p>
            </div>

            {METRICS.map((m) => (
              <FaceOffRow
                key={m.fogoKey}
                label={m.label}
                fogoVal={comparison.fogo[m.fogoKey]}
                solanaVal={comparison.solana[m.fogoKey]}
                suffix={m.suffix}
                decimals={m.decimals}
                higherIsBetter={m.higherIsBetter}
                format={m.format}
              />
            ))}
          </div>
        ) : null}

        {/* Historical Chart */}
        <ChartContainer
          title="Execution Quality Over Time"
          subtitle="Slippage comparison (bps) - Cyan: Fogo, Purple: Solana"
          loading={isLoading}
        >
          {fogoChartData.length > 0 ? (
            <TVChart
              data={fogoChartData}
              overlayData={solanaChartData}
              lineColor="#06b6d4"
              overlayColor="#9945FF"
              height={350}
            />
          ) : !isLoading ? (
            <div className="flex flex-col items-center justify-center h-[350px] text-center">
              <p className="text-text-secondary text-sm">
                Historical comparison data is being collected.
              </p>
              <p className="text-text-muted text-xs mt-1">
                Chart will populate as cross-chain comparison data accumulates over the next 24 hours.
              </p>
            </div>
          ) : null}
        </ChartContainer>

        {/* Share Button */}
        <div className="flex justify-center">
          <ShareButton
            title="Fogo vs Solana Comparison"
            metrics={[
              { label: "Fogo Slippage", value: `${comparison?.fogo?.slippageBps?.toFixed(1) ?? "—"} bps` },
              { label: "Solana Slippage", value: `${comparison?.solana?.slippageBps?.toFixed(1) ?? "—"} bps` },
              { label: "Fogo Block Time", value: `${Math.round(comparison?.fogo?.blockTimeMs ?? 40)}ms` },
            ]}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
