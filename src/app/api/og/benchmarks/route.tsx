import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(request: Request) {
  let blockTime = "~40ms";
  let tps = "0";
  try {
    const url = new URL("/api/benchmarks", request.url);
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      blockTime = `${Math.round(data.currentBlockTimeMs)}ms`;
      tps = data.chains?.[0]?.tps?.toLocaleString() ?? "0";
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
        <div style={{ fontSize: "48px", fontWeight: "bold", color: "#f1f5f9", marginBottom: "8px" }}>
          Fogo Speed Report
        </div>
        <div style={{ fontSize: "20px", color: "#94a3b8", marginBottom: "48px" }}>
          Live Performance Benchmarks
        </div>
        <div style={{ display: "flex", gap: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 48px", borderRadius: "16px", border: "1px solid #1e293b", background: "#111827" }}>
            <div style={{ fontSize: "56px", fontWeight: "bold", color: "#06b6d4" }}>{blockTime}</div>
            <div style={{ fontSize: "16px", color: "#94a3b8", marginTop: "8px" }}>Block Time</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 48px", borderRadius: "16px", border: "1px solid #1e293b", background: "#111827" }}>
            <div style={{ fontSize: "56px", fontWeight: "bold", color: "#22c55e" }}>{tps}</div>
            <div style={{ fontSize: "16px", color: "#94a3b8", marginTop: "8px" }}>TPS</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px", marginTop: "32px" }}>
          <div style={{ fontSize: "16px", color: "#94a3b8" }}>10x faster than Solana</div>
          <div style={{ fontSize: "16px", color: "#475569" }}>|</div>
          <div style={{ fontSize: "16px", color: "#94a3b8" }}>300x faster than Ethereum</div>
        </div>
        <div style={{ position: "absolute", bottom: "24px", fontSize: "14px", color: "#475569" }}>
          Data by FogoScope
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
