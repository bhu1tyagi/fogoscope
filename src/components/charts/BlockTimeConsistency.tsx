"use client";

import { useMemo } from "react";
import { TVChart } from "@/components/charts/TVChartDynamic";
import { THEME } from "@/lib/utils/constants";

interface BlockTimeConsistencyProps {
  data: { time: string; value: number }[];
  loading?: boolean;
}

export function BlockTimeConsistency({ data, loading }: BlockTimeConsistencyProps) {
  // Generate Solana reference line at 400ms
  const solanaOverlay = useMemo(() => {
    if (!data.length) return [];
    return data.map((d) => ({ time: d.time, value: 400 }));
  }, [data]);

  return (
    <div>
      <TVChart
        data={data}
        overlayData={solanaOverlay}
        type="line"
        height={350}
        lineColor={THEME.colors.fogo}
        overlayColor={THEME.colors.solana}
        loading={loading}
      />
      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-accent-cyan" />
          <span className="text-[11px] text-text-muted">Fogo (live)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full" style={{ background: THEME.colors.solana }} />
          <span className="text-[11px] text-text-muted">Solana (~400ms ref)</span>
        </div>
        <div className="flex items-center gap-4 ml-auto text-[11px] text-text-muted">
          <span>Ethereum: ~12,000ms</span>
          <span>Hyperliquid: ~200ms</span>
        </div>
      </div>
    </div>
  );
}

export default BlockTimeConsistency;
