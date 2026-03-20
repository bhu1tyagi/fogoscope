"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Clipboard, Check, Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import MetricCard from "@/components/ui/MetricCard";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { TVChart } from "@/components/charts/TVChartDynamic";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils/cn";
import {
  formatCurrency,
  formatBps,
  timeAgo,
  shortenAddress,
} from "@/lib/utils/formatters";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";
import ShareButton from "@/components/ui/ShareButton";
import TradeDrawer from "@/components/ui/TradeDrawer";
import type { TradeRecord } from "@/types/metrics";

/* ---------- trade table columns ---------- */

const tradeColumns = [
  {
    key: "timestamp",
    label: "Time",
    render: (value: unknown) => (
      <span className="text-xs text-text-secondary">
        {timeAgo(new Date(String(value)))}
      </span>
    ),
  },
  {
    key: "pair",
    label: "Pair",
    render: (value: unknown) => (
      <span className="font-mono text-xs">{String(value)}</span>
    ),
  },
  {
    key: "dex",
    label: "DEX",
  },
  {
    key: "side",
    label: "Side",
    render: (value: unknown) => {
      const side = String(value);
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
    align: "right" as const,
    sortable: true,
    render: (value: unknown) => formatCurrency(Number(value)),
  },
  {
    key: "slippageBps",
    label: "Slippage",
    align: "right" as const,
    sortable: true,
    render: (value: unknown) => {
      if (value == null) return <span className="text-text-muted">--</span>;
      const bps = Number(value);
      return (
        <span
          className={cn(
            "font-mono text-xs",
            bps <= 5
              ? "text-accent-green"
              : bps <= 20
                ? "text-accent-orange"
                : "text-accent-red",
          )}
        >
          {formatBps(bps)}
        </span>
      );
    },
  },
  {
    key: "executionTimeMs",
    label: "Exec Time",
    align: "right" as const,
    sortable: true,
    render: (value: unknown) =>
      value != null ? (
        <span className="font-mono text-xs">{Number(value).toFixed(0)}ms</span>
      ) : (
        <span className="text-text-muted">--</span>
      ),
  },
  {
    key: "isSession",
    label: "Session",
    render: (value: unknown) => (
      <Badge variant={value ? "success" : "default"}>
        {value ? "Yes" : "No"}
      </Badge>
    ),
  },
];

/* ---------- search component ---------- */

function WalletSearch() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed) {
        router.push(`/wallet/${trimmed}`);
      }
    },
    [input, router],
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="flex flex-col items-center gap-2">
        <Search size={48} className="text-text-muted" />
        <h2 className="text-xl font-semibold text-text-primary">
          Wallet Analysis
        </h2>
        <p className="text-text-secondary text-sm">
          Enter a wallet address to analyze execution quality
        </p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter wallet address..."
          className="bg-bg-card rounded-xl border border-border-default p-4 w-full text-lg font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan transition-colors"
        />
      </form>
    </div>
  );
}

/* ---------- copy button ---------- */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-text-muted hover:text-text-primary"
      title="Copy address"
    >
      {copied ? <Check size={16} /> : <Clipboard size={16} />}
    </button>
  );
}

/* ---------- wallet analysis view ---------- */

function WalletAnalysisView({ address }: { address: string }) {
  const { data, isLoading } = useWallet(address);
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);

  const tradeRows = useMemo(
    () => (data?.trades ?? []).map((t) => ({ ...t })) as Record<string, unknown>[],
    [data?.trades],
  );

  return (
    <PageWrapper title="Wallet Analysis" description="Execution quality and trade history">
      {/* Wallet Header — address, balance, links */}
      <div className="bg-bg-card rounded-xl border border-border-default p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-accent-cyan/10 flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-accent-cyan" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-text-primary text-sm break-all">
                  {address}
                </span>
                <CopyButton text={address} />
              </div>
              {!isLoading && data && (
                <p className="text-text-muted text-xs mt-0.5">
                  {(data.tokens ?? []).length + 1} tokens &middot; {(data.recentTransactions ?? []).length} recent txns
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ShareButton
              title="Fogo Wallet Report"
              metrics={[
                { label: "Execution Score", value: `${data?.executionScore ?? 0}/100` },
                { label: "Avg Slippage", value: `${(data?.avgSlippageBps ?? 0).toFixed(1)} bps` },
                { label: "Total Trades", value: String(data?.totalTrades ?? 0) },
              ]}
            />
            {/* FOGO Balance */}
            {!isLoading && data && (
              <div className="bg-bg-sidebar rounded-lg px-4 py-2 text-right">
                <p className="text-xs text-text-muted">Balance</p>
                <p className="font-mono text-lg font-bold text-text-primary">
                  {(data.solBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="text-sm text-text-muted ml-1">FOGO</span>
                </p>
              </div>
            )}

            {/* FogoScan link */}
            <a
              href={`https://fogoscan.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent-cyan/10 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 transition-colors"
            >
              <ExternalLink size={14} />
              FogoScan
            </a>
          </div>
        </div>
      </div>

      {/* On-chain wallet data — always shown */}
      {!isLoading && data && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Token Holdings */}
            <div className="bg-bg-card rounded-xl border border-border-default p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-accent-cyan" />
                  <h3 className="text-sm font-medium text-text-secondary">Token Holdings</h3>
                </div>
                <span className="text-xs text-text-muted">
                  {(data.tokens ?? []).length + 1} assets
                </span>
              </div>

              {/* Token list */}
              <div className="space-y-0">
                {/* Native FOGO */}
                <div className="flex items-center justify-between py-3 border-b border-border-default">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/15 flex items-center justify-center text-xs font-bold text-accent-cyan">
                      F
                    </div>
                    <div>
                      <span className="text-sm font-medium text-text-primary block">FOGO</span>
                      <span className="text-xs text-text-muted">Native</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm text-text-primary block">
                      {(data.solBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                </div>

                {/* SPL Tokens */}
                {(data.tokens ?? []).map((token) => (
                  <div key={token.mint} className="flex items-center justify-between py-3 border-b border-border-default last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center text-xs font-bold text-purple-400">
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text-primary block">{token.symbol}</span>
                        <span className="text-xs text-text-muted font-mono">{token.mint.slice(0, 8)}...{token.mint.slice(-4)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-text-primary block">
                        {token.amount.toLocaleString(undefined, { maximumFractionDigits: token.amount > 1000 ? 0 : 4 })}
                      </span>
                      {token.usdValue !== null && token.usdValue > 0 && (
                        <span className="text-xs text-text-muted">
                          {formatCurrency(token.usdValue)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {(data.tokens ?? []).length === 0 && (data.solBalance ?? 0) === 0 && (
                  <p className="text-text-muted text-sm py-4 text-center">No tokens found</p>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-bg-card rounded-xl border border-border-default p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={16} className="text-accent-cyan" />
                  <h3 className="text-sm font-medium text-text-secondary">Recent Transactions</h3>
                </div>
                <a
                  href={`https://fogoscan.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-cyan hover:underline flex items-center gap-1"
                >
                  View all <ExternalLink size={10} />
                </a>
              </div>

              {(data.recentTransactions ?? []).length === 0 ? (
                <p className="text-text-muted text-sm py-4 text-center">No transactions found</p>
              ) : (
                <div className="space-y-0.5 max-h-[400px] overflow-y-auto scrollbar-thin">
                  {(data.recentTransactions ?? []).map((tx) => (
                    <a
                      key={tx.signature}
                      href={`https://fogoscan.com/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-bg-card-hover transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                          tx.success ? "bg-accent-green/15" : "bg-accent-red/15"
                        )}>
                          {tx.success ? (
                            <Check size={12} className="text-green-400" />
                          ) : (
                            <span className="text-red-400 text-xs font-bold">!</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-text-primary block truncate">
                            {tx.signature.slice(0, 24)}...
                          </span>
                          <span className="text-xs text-text-muted">
                            Slot {tx.slot.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-text-muted whitespace-nowrap">
                          {tx.timestamp ? timeAgo(new Date(tx.timestamp)) : "—"}
                        </span>
                        <ExternalLink size={10} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scorecard Row — only show when data exists */}
      {(isLoading || (data?.totalTrades ?? 0) > 0) && (<>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <MetricCard
          label="Execution Score"
          value={data?.executionScore ?? 0}
          suffix="/100"
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.walletExecScore}
        />
        <MetricCard
          label="Total Trades"
          value={data?.totalTrades ?? 0}
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.totalTrades}
        />
        <MetricCard
          label="Avg Slippage"
          value={data?.avgSlippageBps ?? 0}
          suffix="bps"
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.avgSlippage}
        />
        <MetricCard
          label="Total Volume"
          value={data?.totalVolumeUsd ?? 0}
          prefix="$"
          loading={isLoading}
          tooltip={METRIC_TOOLTIPS.totalVolume}
        />
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <MetricCard
          label="Best Slippage"
          value={data?.bestSlippageBps ?? 0}
          suffix="bps"
          loading={isLoading}
          className="[&_.font-mono]:text-accent-green"
        />
        <MetricCard
          label="Worst Slippage"
          value={data?.worstSlippageBps ?? 0}
          suffix="bps"
          loading={isLoading}
          className="[&_.font-mono]:text-accent-red"
        />
        <div className="bg-bg-card rounded-xl border border-border-default p-5">
          <p className="text-text-secondary text-sm mb-1">Preferred DEX</p>
          <div className="text-2xl font-bold text-text-primary mt-1">
            {isLoading ? (
              <div className="h-8 w-24 rounded bg-border-default animate-shimmer" />
            ) : (
              <Badge variant="info">{data?.preferredDex ?? "--"}</Badge>
            )}
          </div>
        </div>
        <MetricCard
          label="Session Usage"
          value={data?.sessionUsageRate ?? 0}
          suffix="%"
          loading={isLoading}
        />
      </div>

      {/* Slippage Over Time */}
      <div className="mt-6">
        <ChartContainer title="Slippage Over Time" loading={isLoading}>
          <TVChart
            data={data?.slippageHistory ?? []}
            type="area"
            height={300}
            lineColor="#f59e0b"
            areaTopColor="rgba(245, 158, 11, 0.3)"
            areaBottomColor="rgba(245, 158, 11, 0.0)"
            loading={isLoading}
          />
        </ChartContainer>
      </div>

      {/* Trade History Table */}
      <div className="mt-6">
        <DataTable
          columns={tradeColumns}
          data={tradeRows}
          loading={isLoading}
          emptyMessage="No trades found for this wallet"
          onRowClick={(row) => {
            const trade = data?.trades?.find((t) => t.id === row.id);
            if (trade) setSelectedTrade(trade);
          }}
        />
      </div>
      </>)}
      <TradeDrawer
        trade={selectedTrade}
        open={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
      />
    </PageWrapper>
  );
}

/* ---------- page ---------- */

export default function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);

  if (!address || address === "undefined") {
    return (
      <PageWrapper title="Wallet Analysis" description="Execution quality and trade history">
        <WalletSearch />
      </PageWrapper>
    );
  }

  return <WalletAnalysisView address={address} />;
}
