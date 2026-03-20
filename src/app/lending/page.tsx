"use client";

import { useMemo } from "react";
import { AlertTriangle, DollarSign, HeartPulse } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import MetricCard from "@/components/ui/MetricCard";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { BarChart } from "@/components/charts/BarChart";
import { useLending } from "@/hooks/useLending";
import { cn } from "@/lib/utils/cn";
import { RocketAnimation } from "@/components/animations";
import {
  formatCurrency,
  formatNumber,
  shortenAddress,
} from "@/lib/utils/formatters";

/* ---------- helpers ---------- */

function healthColor(hf: number): string {
  if (hf > 2) return "text-accent-green";
  if (hf >= 1.2) return "text-accent-orange";
  return "text-accent-red";
}

function gaugeColor(hf: number): string {
  if (hf > 2) return "#22c55e";
  if (hf >= 1.2) return "#f59e0b";
  return "#ef4444";
}

/** Returns a semi-circular arc path for the gauge. fraction 0-1. */
function describeArc(fraction: number): string {
  const r = 60;
  const cx = 70;
  const cy = 70;
  // Arc goes from left (180deg) to right (0deg)
  const startAngle = Math.PI; // 180 degrees
  const endAngle = Math.PI - fraction * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = fraction > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
}

/* ---------- sub-components ---------- */

function HealthGauge({
  market,
  healthFactor,
  utilization,
}: {
  market: string;
  healthFactor: number;
  utilization: number;
}) {
  // Clamp health factor between 0..4 for gauge display
  const clampedHf = Math.min(Math.max(healthFactor, 0), 4);
  const fraction = clampedHf / 4;
  const color = gaugeColor(healthFactor);

  return (
    <div className="bg-bg-card rounded-xl p-5 flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-text-secondary">{market}</p>

      {/* SVG semi-circular gauge */}
      <svg width={140} height={80} viewBox="0 0 140 80">
        {/* Background track */}
        <path
          d={describeArc(1)}
          fill="none"
          stroke="#1e293b"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={describeArc(fraction)}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
        />
      </svg>

      <span className={cn("text-2xl font-bold font-mono", healthColor(healthFactor))}>
        {healthFactor.toFixed(2)}
      </span>

      {/* Utilization bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>Utilization</span>
          <span>{(utilization * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-border-default rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(utilization * 100, 100)}%`,
              backgroundColor: utilization > 0.9 ? "#ef4444" : utilization > 0.7 ? "#f59e0b" : "#06b6d4",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- columns ---------- */

const positionsColumns = [
  {
    key: "wallet",
    label: "Wallet",
    render: (value: unknown) => (
      <a
        href={`https://fogoscan.com/address/${String(value)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-text-secondary hover:text-accent-cyan transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {shortenAddress(String(value))}
      </a>
    ),
  },
  {
    key: "protocol",
    label: "Protocol",
    render: (value: unknown) => <Badge variant="info">{String(value)}</Badge>,
  },
  {
    key: "collateralToken",
    label: "Collateral Token",
  },
  {
    key: "collateralAmount",
    label: "Collateral Amt",
    align: "right" as const,
    sortable: true,
    render: (value: unknown) => formatNumber(Number(value)),
  },
  {
    key: "borrowToken",
    label: "Borrow Token",
  },
  {
    key: "borrowAmount",
    label: "Borrow Amt",
    align: "right" as const,
    sortable: true,
    render: (value: unknown) => formatNumber(Number(value)),
  },
  {
    key: "healthFactor",
    label: "Health Factor",
    align: "right" as const,
    sortable: true,
    render: (value: unknown) => {
      const hf = Number(value);
      return (
        <span className={cn("font-mono font-medium", healthColor(hf))}>
          {hf.toFixed(2)}
        </span>
      );
    },
  },
  {
    key: "liquidationPrice",
    label: "Liq. Price",
    align: "right" as const,
    sortable: true,
    render: (value: unknown) =>
      value != null ? formatCurrency(Number(value)) : "N/A",
  },
];

/* ---------- page ---------- */

export default function LendingPage() {
  const { data, isLoading } = useLending();

  const avgHealthFactor = useMemo(() => {
    if (!data?.positions?.length) return 0;
    const sum = data.positions.reduce((acc, p) => acc + p.healthFactor, 0);
    return sum / data.positions.length;
  }, [data?.positions]);

  const positionRows = useMemo(
    () =>
      (data?.positions ?? []).map((p) => ({
        ...p,
      })) as Record<string, unknown>[],
    [data?.positions],
  );

  const distributionData = useMemo(
    () =>
      (data?.healthDistribution ?? []).map((d) => ({
        bucket: d.bucket,
        count: d.count,
      })) as Record<string, unknown>[],
    [data?.healthDistribution],
  );

  return (
    <PageWrapper
      title="Lending Health"
      description="Monitor Pyron and FogoLend positions approaching liquidation"
    >
      {!isLoading && (data?.positions ?? []).length === 0 ? (
        <div className="mt-6 bg-bg-card rounded-xl border border-border-default p-12 text-center">
          <RocketAnimation size={80} />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No Lending Positions Tracked Yet
          </h3>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Lending protocol monitoring will activate once FogoLend, Kamino, or other lending protocols launch on Fogo.
            Positions, health factors, and liquidation risks will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Risk Dashboard Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Positions at Risk"
              value={data?.positionsAtRisk ?? 0}
              icon={AlertTriangle}
              loading={isLoading}
            />
            <MetricCard
              label="Value at Risk"
              value={data?.totalValueAtRisk ?? 0}
              prefix="$"
              loading={isLoading}
            />
            <MetricCard
              label="Avg Health Factor"
              value={avgHealthFactor}
              icon={HeartPulse}
              loading={isLoading}
            />
          </div>

          {/* Market Health Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-bg-card rounded-xl p-5 h-56 animate-pulse"
                  />
                ))
              : (data?.marketHealth ?? []).map((m) => (
                  <HealthGauge
                    key={m.market}
                    market={m.market}
                    healthFactor={m.healthFactor}
                    utilization={m.utilization}
                  />
                ))}
          </div>

          {/* Health Distribution Chart */}
          <div className="mt-6">
            <ChartContainer title="Health Factor Distribution" loading={isLoading}>
              <BarChart
                data={distributionData}
                dataKeys={[
                  { key: "count", color: "#06b6d4", name: "Positions" },
                ]}
                xAxisKey="bucket"
                height={280}
              />
            </ChartContainer>
          </div>

          {/* Positions Table */}
          <div className="mt-6">
            <DataTable
              columns={positionsColumns}
              data={positionRows}
              loading={isLoading}
              emptyMessage="No lending positions found"
            />
          </div>
        </>
      )}
    </PageWrapper>
  );
}
