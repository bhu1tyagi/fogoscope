"use client";

import { useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  DollarSign,
  Users,
} from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import MetricCard from "@/components/ui/MetricCard";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";
import { useBridge } from "@/hooks/useBridge";
import { cn } from "@/lib/utils/cn";
import { METRIC_TOOLTIPS } from "@/lib/utils/tooltip-content";
import { BridgeAnimation } from "@/components/animations";
import {
  formatCurrency,
  shortenAddress,
  timeAgo,
} from "@/lib/utils/formatters";

const transferColumns = [
  {
    key: "timestamp",
    label: "Time",
    sortable: true,
    render: (value: unknown) =>
      value ? timeAgo(new Date(value as string)) : "\u2014",
  },
  {
    key: "direction",
    label: "Direction",
    sortable: true,
    render: (value: unknown) => {
      const isInbound = value === "inbound";
      return (
        <Badge variant={isInbound ? "success" : "warning"}>
          {isInbound ? "Inbound" : "Outbound"}
        </Badge>
      );
    },
  },
  {
    key: "sourceChain",
    label: "Source Chain",
    sortable: true,
  },
  {
    key: "token",
    label: "Token",
    sortable: true,
  },
  {
    key: "amountUsd",
    label: "Amount",
    sortable: true,
    align: "right" as const,
    render: (value: unknown) =>
      value != null ? formatCurrency(value as number) : "\u2014",
  },
  {
    key: "sender",
    label: "Sender",
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
  {
    key: "recipient",
    label: "Recipient",
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
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value: unknown) => {
      const statusMap: Record<
        string,
        "success" | "warning" | "danger"
      > = {
        completed: "success",
        pending: "warning",
        failed: "danger",
      };
      return (
        <Badge variant={statusMap[value as string] ?? "default"}>
          {String(value)}
        </Badge>
      );
    },
  },
];

export default function BridgePage() {
  const { data: bridgeData, isLoading } = useBridge();

  const netFlow = bridgeData?.netFlow ?? 0;
  const netFlowPositive = netFlow >= 0;

  const flowChartData = useMemo(() => {
    if (!bridgeData?.flowByChain) return [];
    return bridgeData.flowByChain.map((f) => ({
      chain: f.chain,
      inflow: f.inflow,
      outflow: f.outflow,
    }));
  }, [bridgeData?.flowByChain]);

  const transferRows = useMemo(() => {
    if (!bridgeData?.transfers) return [];
    return bridgeData.transfers as unknown as Record<string, unknown>[];
  }, [bridgeData?.transfers]);

  return (
    <PageWrapper
      title="Bridge Monitor"
      description="Track Wormhole bridge flows in and out of Fogo"
    >
      <div className="space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Total Inflow 24h"
            value={bridgeData?.inflow24h ?? 0}
            prefix="$"
            loading={isLoading}
            icon={ArrowDownLeft}
            tooltip={METRIC_TOOLTIPS.inflow}
          />
          <MetricCard
            label="Total Outflow 24h"
            value={bridgeData?.outflow24h ?? 0}
            prefix="$"
            loading={isLoading}
            icon={ArrowUpRight}
            tooltip={METRIC_TOOLTIPS.outflow}
          />
          <MetricCard
            label="Net Flow"
            value={Math.abs(netFlow)}
            prefix={netFlowPositive ? "+$" : "-$"}
            loading={isLoading}
            icon={Activity}
            tooltip={METRIC_TOOLTIPS.netFlow}
            className={cn(
              !isLoading &&
                (netFlowPositive
                  ? "border-accent-green/30"
                  : "border-accent-red/30")
            )}
          />
          <MetricCard
            label="Avg Transfer Size"
            value={bridgeData?.avgTransferSize ?? 0}
            prefix="$"
            loading={isLoading}
            icon={DollarSign}
            tooltip={METRIC_TOOLTIPS.avgTransferSize}
          />
          <MetricCard
            label="Unique Addresses"
            value={bridgeData?.uniqueAddresses ?? 0}
            loading={isLoading}
            icon={Users}
            tooltip={METRIC_TOOLTIPS.uniqueAddresses}
          />
        </div>

        {/* Flow Visualization */}
        <ChartContainer
          title="Bridge Flows by Chain"
          subtitle="Inflows (green) and outflows (red) per source chain"
          loading={isLoading}
        >
          {flowChartData.length > 0 && (
            <BarChart
              data={flowChartData}
              xAxisKey="chain"
              dataKeys={[
                { key: "inflow", color: "#22c55e", name: "Inflow" },
                { key: "outflow", color: "#ef4444", name: "Outflow" },
              ]}
              showLegend
              height={320}
            />
          )}
        </ChartContainer>

        {/* Transfer Table */}
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-3">
            Recent Transfers
          </h2>
          <DataTable
            columns={transferColumns}
            data={transferRows}
            loading={isLoading}
            emptyMessage="No bridge transfers found"
            emptyAnimation={<BridgeAnimation size={80} />}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
