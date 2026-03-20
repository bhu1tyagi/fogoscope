"use client";

import { useMemo } from "react";
import MetricCard from "@/components/ui/MetricCard";
import DataTable from "@/components/ui/DataTable";
import { PieChart } from "@/components/charts/PieChart";
import { ChartContainer } from "@/components/charts/ChartContainer";
import Badge from "@/components/ui/Badge";
import { shortenAddress, formatLatency } from "@/lib/utils/formatters";

interface ValidatorInfo {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number;
  stakePercent: number;
  commission: number;
  lastVote: number;
  blocksProduced24h: number;
  avgBlockTimeMs: number;
  isActive: boolean;
}

interface ValidatorData {
  validators: ValidatorInfo[];
  totalStake: number;
  stakeDistribution: { name: string; value: number; color: string }[];
  totalBlocksProduced24h: number;
}

interface ValidatorPerformanceProps {
  data?: ValidatorData;
  loading: boolean;
}

export function ValidatorPerformance({ data, loading }: ValidatorPerformanceProps) {
  const validatorColumns = useMemo(
    () => [
      {
        key: "votePubkey",
        label: "Validator",
        render: (value: unknown) => (
          <a
            href={`https://fogoscan.com/address/${String(value)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-text-secondary hover:text-accent-cyan transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {shortenAddress(String(value), 4)}
          </a>
        ),
      },
      {
        key: "activatedStake",
        label: "Stake",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) => (
          <span className="font-mono text-xs">
            {Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} FOGO
          </span>
        ),
      },
      {
        key: "stakePercent",
        label: "Stake %",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) => (
          <span className="font-mono text-xs">{Number(value).toFixed(1)}%</span>
        ),
      },
      {
        key: "commission",
        label: "Commission",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) => (
          <span className="font-mono text-xs">{Number(value)}%</span>
        ),
      },
      {
        key: "blocksProduced24h",
        label: "Blocks 24h",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) => (
          <span className="font-mono text-xs">{Number(value).toLocaleString()}</span>
        ),
      },
      {
        key: "avgBlockTimeMs",
        label: "Avg Block Time",
        sortable: true,
        align: "right" as const,
        render: (value: unknown) => (
          <span className="font-mono text-xs">{Number(value) > 0 ? formatLatency(Number(value)) : "—"}</span>
        ),
      },
      {
        key: "isActive",
        label: "Status",
        render: (value: unknown) => (
          <Badge variant={value ? "success" : "danger"}>
            {value ? "Active" : "Delinquent"}
          </Badge>
        ),
      },
    ],
    []
  );

  const tableData = useMemo(() => {
    if (!data?.validators) return [];
    return data.validators.map((v) => ({ ...v })) as unknown as Record<string, unknown>[];
  }, [data]);

  const distribution = data?.stakeDistribution ?? [];

  return (
    <div className="space-y-6">
      {/* Row: Donut + Legend + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Donut + legend */}
        <ChartContainer title="Stake Distribution" loading={loading}>
          <div className="flex flex-col items-center gap-3">
            {distribution.length > 0 && (
              <div className="w-full">
                <PieChart
                  data={distribution}
                  innerRadius={50}
                  outerRadius={75}
                  height={180}
                  showLabels={false}
                />
              </div>
            )}
            {/* Legend grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full px-2">
              {distribution.map((item) => {
                const total = distribution.reduce((s, d) => s + d.value, 0);
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                return (
                  <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-[10px] text-text-muted truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono ml-auto shrink-0">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartContainer>

        {/* Summary cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <MetricCard
            label="Total Stake"
            value={data?.totalStake ? `${(data.totalStake / 1e6).toFixed(1)}M` : "—"}
            suffix=" FOGO"
            loading={loading}
          />
          <MetricCard
            label="Active Validators"
            value={data?.validators?.filter((v) => v.isActive).length ?? 0}
            loading={loading}
          />
          <MetricCard
            label="Blocks Produced 24h"
            value={data?.totalBlocksProduced24h ?? 0}
            loading={loading}
          />
          <MetricCard
            label="Total Validators"
            value={data?.validators?.length ?? 0}
            loading={loading}
          />
        </div>
      </div>

      {/* Validator Table */}
      <DataTable
        columns={validatorColumns}
        data={tableData}
        loading={loading}
        emptyMessage="No validator data available"
      />
    </div>
  );
}

export default ValidatorPerformance;
