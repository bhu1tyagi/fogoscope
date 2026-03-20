"use client";

import { Suspense, useMemo, useState } from "react";
import { useQueryState } from "nuqs";
import {
  Award,
  TrendingDown,
  Shield,
  Clock,
  BarChart3,
  Swords,
  Info,
} from "lucide-react";

import { useMetrics } from "@/hooks/useMetrics";
import { useTrades } from "@/hooks/useTrades";
import { useSlippage } from "@/hooks/useSlippage";
import { useMEV } from "@/hooks/useMEV";
import { usePrices } from "@/hooks/usePrices";
import { useBridge } from "@/hooks/useBridge";

import LiveTicker from "@/components/ui/LiveTicker";
import MetricCard from "@/components/ui/MetricCard";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import Skeleton from "@/components/ui/Skeleton";
import { TVChart } from "@/components/charts/TVChartDynamic";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";

import { Tooltip } from "@/components/ui/Tooltip";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";
import UnlockCountdown from "@/components/ui/UnlockCountdown";
import TradeDrawer from "@/components/ui/TradeDrawer";
import ShareButton from "@/components/ui/ShareButton";
import AmbientTracker from "@/components/ui/AmbientTracker";
import type { TradeRecord } from "@/types/metrics";

import { cn } from "@/lib/utils/cn";
import {
  formatCurrency,
  formatBps,
  timeAgo,
} from "@/lib/utils/formatters";

const TIME_RANGES = ["1h", "24h", "7d", "30d"] as const;

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardHome />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

function DashboardHome() {
  const [range, setRange] = useQueryState("range", { defaultValue: "24h" });
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);

  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: prices, isLoading: pricesLoading } = usePrices();
  const { data: slippageData, isLoading: slippageLoading } = useSlippage({
    timeRange: range,
  });
  const { data: tradesResponse, isLoading: tradesLoading } = useTrades({
    limit: 15,
  });
  const { data: mevData, isLoading: mevLoading } = useMEV({
    timeRange: range,
  });
  const { data: bridgeData, isLoading: bridgeLoading } = useBridge({
    timeframe: "7d",
  });

  // Map prices to ticker items
  const tickerItems = useMemo(() => {
    if (!prices) return [];
    return prices.map((token) => ({
      pair: `${token.symbol}/USD`,
      price: token.priceUsd,
      change: token.change24h,
    }));
  }, [prices]);

  const fogoPrice = useMemo(() => {
    if (!prices) return undefined;
    const fogo = prices.find((t) => t.symbol === "FOGO");
    return fogo?.priceUsd;
  }, [prices]);

  // Map MEV events to DataTable rows
  const mevColumns = useMemo(
    () => [
      {
        key: "timestamp",
        label: "Time",
        sortable: true,
        render: (value: unknown) =>
          value ? timeAgo(new Date(value as string)) : "—",
      },
      {
        key: "type",
        label: "Type",
        render: (value: unknown) => {
          const typeStr = value as string;
          return (
            <Badge variant="info">
              {typeStr.replace("_", " ")}
            </Badge>
          );
        },
      },
      {
        key: "severity",
        label: "Severity",
        render: (value: unknown) => {
          const sev = value as string;
          const variant =
            sev === "high"
              ? "danger"
              : sev === "medium"
                ? "warning"
                : sev === "low"
                  ? "success"
                  : "default";
          return (
            <Badge variant={variant as "danger" | "warning" | "success" | "default"}>
              {sev}
            </Badge>
          );
        },
      },
      {
        key: "description",
        label: "Details",
        render: (value: unknown) => (
          <span className="text-text-secondary text-xs max-w-[200px] truncate block">
            {(value as string) ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  const mevTableData = useMemo(() => {
    if (!mevData?.events) return [];
    return mevData.events.slice(0, 10).map((e) => ({
      ...e,
    })) as unknown as Record<string, unknown>[];
  }, [mevData]);

  // Bridge flow data for BarChart
  const bridgeChartData = useMemo(() => {
    if (!bridgeData?.flowByChain) return [];
    return bridgeData.flowByChain.map((item) => ({
      chain: item.chain,
      inflow: item.inflow,
      outflow: item.outflow,
    })) as unknown as Record<string, unknown>[];
  }, [bridgeData]);

  // Time range action buttons for the slippage chart
  const timeRangeActions = (
    <div className="flex gap-1">
      {TIME_RANGES.map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
            range === r
              ? "bg-accent-cyan text-black"
              : "bg-bg-card text-text-secondary border border-border-default hover:text-text-primary"
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 1. Live Ticker */}
      {pricesLoading ? (
        <Skeleton className="h-8 w-full rounded" />
      ) : (
        <LiveTicker items={tickerItems} />
      )}

      {/* 2. Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Execution Score"
          value={metrics?.executionScore ?? 0}
          suffix="/100"
          icon={Award}
          loading={metricsLoading}
          tooltip={METRIC_TOOLTIPS.executionScore}
        />
        <MetricCard
          label="Avg Slippage 24h"
          value={metrics?.avgSlippageBps ?? 0}
          suffix=" bps"
          icon={TrendingDown}
          delta={metrics ? -(metrics.avgSlippageBps / 10) : undefined}
          loading={metricsLoading}
          tooltip={METRIC_TOOLTIPS.avgSlippage}
        />
        <MetricCard
          label="MEV Detected"
          value={metrics?.mevDetected24h ?? 0}
          icon={Shield}
          loading={metricsLoading}
          tooltip={METRIC_TOOLTIPS.mevDetected}
        />
        <MetricCard
          label="Block Time"
          value={metrics?.avgBlockTimeMs ?? 0}
          suffix=" ms"
          icon={Clock}
          loading={metricsLoading}
          tooltip={METRIC_TOOLTIPS.blockTime}
        />
        <MetricCard
          label="24h Volume"
          value={metrics ? formatCurrency(metrics.volume24h) : "$0"}
          icon={BarChart3}
          loading={metricsLoading}
          tooltip={METRIC_TOOLTIPS.volume24h}
        />
        {/* Fogo vs Solana — custom card with explanation */}
        {metricsLoading ? (
          <div className="bg-bg-card rounded-xl border border-border-default p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <div className="bg-bg-card rounded-xl border border-border-default p-5 hover:border-border-hover transition-all duration-200 relative group">
            <div className="absolute top-5 right-5 flex items-center gap-1.5">
              <Tooltip content={METRIC_TOOLTIPS.fogoVsSolana}>
                <span className="cursor-help">
                  <Info size={16} className="text-text-muted" />
                </span>
              </Tooltip>
            </div>

            <p className="text-text-secondary text-sm mb-1">Fogo vs Solana</p>
            <div className="text-2xl font-bold font-mono text-accent-cyan mb-2">
              <AnimatedNumber
                value={metrics?.fogoVsSolanaPercent ?? 0}
                suffix="% faster"
                decimals={0}
              />
            </div>
            <p className="text-xs text-text-muted">
              Confirmation speed advantage
            </p>
          </div>
        )}
      </div>

      {/* Token Unlock Countdown */}
      <UnlockCountdown fogoPrice={fogoPrice} />

      {/* 3. Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left — Slippage Over Time */}
        <div className="lg:col-span-3">
          <ChartContainer
            title="Slippage Over Time"
            actions={timeRangeActions}
            loading={slippageLoading}
            live
          >
            <TVChart
              data={slippageData?.timeSeries ?? []}
              height={320}
              loading={slippageLoading}
            />
          </ChartContainer>
        </div>

        {/* Right — Recent Trades */}
        <div className="lg:col-span-2">
          <div className="bg-bg-card rounded-xl border border-border-default p-4 h-full flex flex-col">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Recent Trades
            </h3>

            {tradesLoading ? (
              <div className="space-y-3 flex-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 max-h-[340px] scrollbar-thin">
                {(tradesResponse?.data ?? []).map((trade) => {
                  const slipBps = trade.slippageBps ?? 0;
                  const badgeVariant =
                    slipBps < 5
                      ? "success"
                      : slipBps <= 15
                        ? "warning"
                        : "danger";

                  return (
                    <div
                      key={trade.id}
                      onClick={() => setSelectedTrade(trade)}
                      className="cursor-pointer flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-card-hover transition-colors border-b border-border-default last:border-b-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-text-muted">
                          {timeAgo(new Date(trade.timestamp))}
                        </span>
                        <span className="text-sm font-medium text-text-primary">
                          {trade.pair}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={badgeVariant}>
                          {formatBps(slipBps)}
                        </Badge>
                        <span className="text-sm text-text-secondary font-mono tabular-nums">
                          {formatCurrency(trade.amountInUsd)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — Recent MEV Events */}
        <ChartContainer title="Recent MEV Events" loading={mevLoading}>
          {!mevLoading && mevTableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-8 w-8 text-green-400 mb-2 opacity-60" />
              <p className="text-sm font-medium text-green-400">
                No MEV detected
              </p>
              <p className="text-xs text-text-muted mt-1">
                Fogo&apos;s fair ordering keeps trades protected
              </p>
            </div>
          ) : (
            <DataTable
              columns={mevColumns}
              data={mevTableData}
              loading={mevLoading}
              emptyMessage="No MEV events detected"
            />
          )}
        </ChartContainer>

        {/* Right — Bridge Flows (7d) */}
        <ChartContainer title="Bridge Flows (7d)" loading={bridgeLoading}>
          <BarChart
            data={bridgeChartData}
            dataKeys={[
              { key: "inflow", color: "#06b6d4", name: "Inflow" },
              { key: "outflow", color: "#9945FF", name: "Outflow" },
            ]}
            xAxisKey="chain"
            height={260}
            showLegend
            loading={bridgeLoading}
          />
        </ChartContainer>
      </div>

      {/* Ambient Finance */}
      <AmbientTracker />

      {/* Share */}
      <div className="flex justify-center">
        <ShareButton
          title="FogoScope Execution Report"
          metrics={[
            { label: "Execution Score", value: `${metrics?.executionScore ?? 0}/100` },
            { label: "Avg Slippage", value: `${(metrics?.avgSlippageBps ?? 0).toFixed(1)} bps` },
            { label: "Block Time", value: `${Math.round(metrics?.avgBlockTimeMs ?? 40)}ms` },
          ]}
        />
      </div>

      {/* Trade Drawer */}
      <TradeDrawer
        trade={selectedTrade}
        open={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
      />
    </div>
  );
}
