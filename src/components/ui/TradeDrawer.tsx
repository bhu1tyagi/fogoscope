"use client";

import { Drawer } from "vaul";
import { ExternalLink, Wallet, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import Badge from "@/components/ui/Badge";
import { notify } from "@/lib/notifications";
import {
  formatCurrency,
  formatBps,
  formatLatency,
  shortenAddress,
  timeAgo,
} from "@/lib/utils/formatters";
import type { TradeRecord } from "@/types/metrics";

interface TradeDrawerProps {
  trade: TradeRecord | null;
  open: boolean;
  onClose: () => void;
}

export default function TradeDrawer({ trade, open, onClose }: TradeDrawerProps) {
  const router = useRouter();

  if (!trade) return null;

  const handleShareTrade = () => {
    const text = [
      `Trade on Fogo: ${trade.pair}`,
      `Amount: ${formatCurrency(trade.amountInUsd)}`,
      `Slippage: ${trade.slippageBps != null ? formatBps(trade.slippageBps) : "N/A"}`,
      `DEX: ${trade.dex}`,
      `https://fogoscan.com/tx/${trade.signature}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => notify.copied());
  };

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Drawer.Content
          className={cn(
            "fixed z-50 bg-bg-card border-border-default outline-none",
            "bottom-0 left-0 right-0 rounded-t-2xl border-t",
            "max-h-[85vh] overflow-y-auto",
            "md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[480px]",
            "md:rounded-t-none md:rounded-l-2xl md:border-t-0 md:border-l md:max-h-full"
          )}
        >
          {/* Drag handle (mobile only) */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border-hover" />
          </div>

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-text-primary">{trade.pair}</h2>
                <p className="text-sm text-text-secondary mt-0.5">
                  {timeAgo(new Date(trade.timestamp))} on {trade.dex}
                </p>
              </div>
              <Badge variant={trade.side === "buy" ? "success" : "danger"}>
                {trade.side.toUpperCase()}
              </Badge>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Amount In" value={formatCurrency(trade.amountInUsd)} />
              <MetricBox label="Amount Out" value={formatCurrency(trade.amountOutUsd)} />
              <MetricBox
                label="Slippage"
                value={trade.slippageBps != null ? formatBps(trade.slippageBps) : "N/A"}
                valueClassName={
                  trade.slippageBps != null
                    ? trade.slippageBps < 5
                      ? "text-accent-green"
                      : trade.slippageBps <= 15
                        ? "text-accent-orange"
                        : "text-accent-red"
                    : undefined
                }
              />
              <MetricBox
                label="Exec Time"
                value={trade.executionTimeMs != null ? formatLatency(trade.executionTimeMs) : "N/A"}
              />
              <MetricBox
                label="Exec Quality"
                value={trade.executionQuality != null ? `${trade.executionQuality}/100` : "N/A"}
              />
              <div className="bg-bg-primary rounded-lg p-3">
                <p className="text-xs text-text-muted mb-1">Session</p>
                <Badge variant={trade.isSession ? "success" : "default"}>
                  {trade.isSession ? "Session TX" : "Direct TX"}
                </Badge>
              </div>
            </div>

            {/* Transaction Signature */}
            <div className="bg-bg-primary rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">Transaction Signature</p>
              <a
                href={`https://fogoscan.com/tx/${trade.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-text-secondary hover:text-accent-cyan transition-colors break-all"
              >
                {trade.signature}
              </a>
            </div>

            {/* Wallet */}
            <div className="bg-bg-primary rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">Wallet</p>
              <a
                href={`https://fogoscan.com/address/${trade.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-text-secondary hover:text-accent-cyan transition-colors break-all"
              >
                {trade.wallet}
              </a>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <a
                href={`https://fogoscan.com/tx/${trade.signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-accent-cyan/15 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/25 transition-colors"
              >
                <ExternalLink size={14} />
                View on FogoScan
              </a>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/wallet/${trade.wallet}`);
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-bg-sidebar text-text-secondary text-sm font-medium hover:text-text-primary transition-colors border border-border-default"
              >
                <Wallet size={14} />
                Analyze Wallet
              </button>
              <button
                onClick={handleShareTrade}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-bg-sidebar text-text-secondary text-sm font-medium hover:text-text-primary transition-colors border border-border-default"
              >
                <Share2 size={14} />
                Share Trade
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function MetricBox({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-bg-primary rounded-lg p-3">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={cn("font-mono font-medium text-text-primary text-sm", valueClassName)}>
        {value}
      </p>
    </div>
  );
}
