import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  let score = 0;
  let avgSlippage = "N/A";
  let totalTrades = 0;
  let volume = "$0";

  try {
    const url = new URL(`/api/wallet/${address}`, request.url);
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      score = data.executionScore ?? 0;
      avgSlippage = data.avgSlippageBps != null ? `${data.avgSlippageBps.toFixed(1)} bps` : "N/A";
      totalTrades = data.totalTrades ?? 0;
      volume = data.totalVolumeUsd != null
        ? `$${data.totalVolumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : "$0";
    }
  } catch {
    // Use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e1a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: "20px", color: "#06b6d4", fontWeight: "bold", marginBottom: "12px" }}>
          FOGOSCOPE
        </div>
        <div style={{ fontSize: "36px", fontWeight: "bold", color: "#f1f5f9", marginBottom: "8px" }}>
          Wallet Report Card
        </div>
        <div style={{ fontSize: "18px", color: "#94a3b8", marginBottom: "40px", fontFamily: "monospace" }}>
          {short}
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          {[
            { label: "Execution Score", value: `${score}/100`, color: "#06b6d4" },
            { label: "Avg Slippage", value: avgSlippage, color: "#22c55e" },
            { label: "Total Trades", value: String(totalTrades), color: "#f59e0b" },
            { label: "Volume", value: volume, color: "#a855f7" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 28px",
                borderRadius: "12px",
                border: "1px solid #1e293b",
                background: "#111827",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: "bold", color: item.color }}>{item.value}</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: "24px", fontSize: "14px", color: "#475569" }}>
          Data by FogoScope
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
