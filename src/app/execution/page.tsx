"use client";

import { Suspense, useState, useMemo } from "react";
import { useQueryState } from "nuqs";

import { useSlippage } from "@/hooks/useSlippage";
import { useTrades } from "@/hooks/useTrades";

import { PageWrapper } from "@/components/layout/PageWrapper";
import MetricCard from "@/components/ui/MetricCard";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import Skeleton from "@/components/ui/Skeleton";
import { TVChart } from "@/components/charts/TVChartDynamic";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";
import { AreaChart } from "@/components/charts/AreaChart";

import { cn } from "@/lib/utils/cn";
import {
  formatCurrency,
  formatNumber,
  formatBps,
  formatLatency,
  shortenAddress,
  timeAgo,
} from "@/lib/utils/formatters";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";
import TradeDrawer from "@/components/ui/TradeDrawer";
import type { TradeRecord } from "@/types/metrics";

const TIME_RANGES = ["1h", "24h", "7d", "30d"] as const;
const PAGE_SIZE = 20;

export default function ExecutionPageWrapper() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-full rounded" /><Skeleton className="h-96 w-full rounded-xl" /></div>}>
      <ExecutionPage />
    </Suspense>
  );
}

function ExecutionPage() {
  const [range, setRange] = useQueryState("range", { defaultValue: "24h" });
  const [page, setPage] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);

  const { data: slippageData, isLoading: slippageLoading } = useSlippage({
    timeRange: range,
  });

  const { data: tradesResponse, isLoading: tradesLoading } = useTrades({
    page,
    limit: PAGE_SIZE,
  });

  const trades = tradesResponse?.data ?? [];
  const totalTrades = tradesResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTrades / PAGE_SIZE));

  // Map distribution data for BarChart
  const distributionData = useMemo(() => {
    if (!slippageData?.distribution) return [];
    return slippageData.distribution.map((d) => ({
      bucket: d.bucket,
      count: d.count,
    })) as unknown as Record<string, unknown>[];
  }, [slippageData]);

  // Map byPair data for BarChart
  const byPairData = useMemo(() => {
    if (!slippageData?.byPair) return [];
    return slippageData.byPair.map((d) => ({
      pair: d.pair,
      avgSlippage: d.avgSlippage,
    })) as unknown as Record<string, unknown>[];
  }, [slippageData]);

  // Map bySize data for AreaChart
  const bySizeData = useMemo(() => {
    if (!slippageData?.bySize) return [];
    return slippageData.bySize.map((d) => ({
      size: formatCurrency(d.size),
      slippage: d.slippage,
    })) as unknown as Record<string, unknown>[];
  }, [slippageData]);

  // Map trades to DataTable rows
  const tradeTableData = useMemo(() => {
    return trades.map((t) => ({
      id: t.id,
      timestamp: t.timestamp,
      pair: t.pair,
      dex: t.dex,
      side: t.side,
      amountInUsd: t.amountInUsd,
      expectedOut: t.expectedOut,
      amountOut: t.amountOut,
      slippageBps: t.slippageBps,
      executionTimeMs: t.executionTimeMs,
      wallet: t.wallet,
      isSession: t.isSession,
    })) as unknown as Record<string, unknown>[];
  }, [trades]);

  const tradeColumns = useMemo(
    () => [
      {
        key: "timestamp",
        label: "Time",
        sortable: true,
        render: (value: unknown) =>
          value ? timeAgo(new Date(value as string)) : "—",
      },
      {
        key: "pair",
        label: "Pair",
        sortable: true,
        render: (value: unknown) => (
          <span className="font-medium text-text-primary">{value as string}</span>
        ),
      },
      {
        key: "dex",
        label: "DEX",
        sortable: true,
      },
      {
        key: "side",
        label: "Side",
        render: (value: unknown) => {
          const side = value as string;
          return (
            <Badge variant={side === "buy" ? "success" : "danger"}>
              {side.toUpperCase()}
            </Badge>
          );
        },
      },
      {
        key: "amountInUsd",
        label: "Amount",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) =>
          value != null ? formatCurrency(value as number) : "—",
      },
      {
        key: "expectedOut",
        label: "Expected",
        align: "right" as const,
        render: (value: unknown) =>
          value != null ? formatNumber(value as number) : "—",
      },
      {
        key: "amountOut",
        label: "Actual",
        align: "right" as const,
        render: (value: unknown) =>
          value != null ? formatNumber(value as number) : "—",
      },
      {
        key: "slippageBps",
        label: "Slippage",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) => {
          if (value == null) return "—";
          const bps = value as number;
          const variant =
            bps < 5 ? "success" : bps <= 15 ? "warning" : "danger";
          return <Badge variant={variant}>{formatBps(bps)}</Badge>;
        },
      },
      {
        key: "executionTimeMs",
        label: "Exec Time",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) =>
          value != null ? formatLatency(value as number) : "—",
      },
      {
        key: "wallet",
        label: "Wallet",
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
          ) : (
            <span className="text-text-muted">—</span>
          ),
      },
      {
        key: "isSession",
        label: "Session",
        render: (value: unknown) =>
          value ? (
            <Badge variant="info">Session</Badge>
          ) : (
            <Badge variant="default">Direct</Badge>
          ),
      },
    ],
    []
  );

  return (
    <PageWrapper
      title="Execution Quality"
      description="Deep dive into trade execution analysis on Fogo"
    >
      {/* Filters Bar */}
      <div className="flex gap-2 items-center mb-6">
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              range === r
                ? "bg-accent-cyan text-black"
                : "bg-bg-card text-text-secondary border border-border-default hover:text-text-primary"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Section 1 — Slippage Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <ChartContainer
            title="Slippage Over Time"
            loading={slippageLoading}
          >
            <TVChart
              data={slippageData?.timeSeries ?? []}
              height={320}
              loading={slippageLoading}
            />
          </ChartContainer>
        </div>
        <div className="lg:col-span-1">
          <ChartContainer
            title="Slippage Distribution"
            loading={slippageLoading}
          >
            <BarChart
              data={distributionData}
              dataKeys={[
                { key: "count", color: "#06b6d4", name: "Trades" },
              ]}
              xAxisKey="bucket"
              height={320}
              loading={slippageLoading}
            />
          </ChartContainer>
        </div>
      </div>

      {/* Section 2 — Slippage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ChartContainer title="Slippage by Pair" loading={slippageLoading}>
          <BarChart
            data={byPairData}
            dataKeys={[
              { key: "avgSlippage", color: "#f59e0b", name: "Avg Slippage (bps)" },
            ]}
            xAxisKey="pair"
            height={280}
            loading={slippageLoading}
          />
        </ChartContainer>

        <ChartContainer
          title="Slippage vs Trade Size"
          loading={slippageLoading}
        >
          <AreaChart
            data={bySizeData}
            dataKeys={[
              { key: "slippage", color: "#06b6d4", name: "Slippage (bps)" },
            ]}
            xAxisKey="size"
            height={280}
            gradientFill
            loading={slippageLoading}
          />
        </ChartContainer>
      </div>

      {/* Section 3 — Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Avg Slippage"
          value={slippageData?.avgSlippageBps ?? 0}
          suffix=" bps"
          loading={slippageLoading}
          tooltip={METRIC_TOOLTIPS.avgSlippageExec}
        />
        <MetricCard
          label="Median Slippage"
          value={slippageData?.medianSlippageBps ?? 0}
          suffix=" bps"
          loading={slippageLoading}
          tooltip={METRIC_TOOLTIPS.medianSlippage}
        />
        <MetricCard
          label="P95 Slippage"
          value={slippageData?.p95SlippageBps ?? 0}
          suffix=" bps"
          loading={slippageLoading}
          tooltip={METRIC_TOOLTIPS.p95Slippage}
        />
        <MetricCard
          label="Total Trades"
          value={totalTrades}
          loading={tradesLoading}
          tooltip={METRIC_TOOLTIPS.totalTrades}
        />
      </div>

      {/* Section 4 — Trade Table */}
      <div className="mb-6">
        <ChartContainer title="Trade History">
          <DataTable
            columns={tradeColumns}
            data={tradeTableData}
            loading={tradesLoading}
            emptyMessage="No trades found for the selected filters"
            onRowClick={(row) => {
              const trade = tradesResponse?.data?.find((t) => t.id === row.id);
              if (trade) setSelectedTrade(trade);
            }}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-default">
              <span className="text-sm text-text-muted">
                Page {page} of {totalPages} ({formatNumber(totalTrades, 0)} total trades)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    page <= 1
                      ? "bg-bg-card text-text-muted cursor-not-allowed"
                      : "bg-bg-card text-text-secondary border border-border-default hover:text-text-primary"
                  )}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    page >= totalPages
                      ? "bg-bg-card text-text-muted cursor-not-allowed"
                      : "bg-bg-card text-text-secondary border border-border-default hover:text-text-primary"
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </ChartContainer>
      </div>

      <TradeDrawer
        trade={selectedTrade}
        open={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
      />
    </PageWrapper>
  );
}
