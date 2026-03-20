import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET(request: Request) {
  let score = 100;
  let sandwichCount = 0;
  let frontrunCount = 0;
  try {
    const url = new URL("/api/mev", request.url);
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      score = data.score ?? 100;
      sandwichCount = data.sandwichCount ?? 0;
      frontrunCount = data.frontrunCount ?? 0;
    }
  } catch {
    // Use defaults
  }

  const scoreColor = score >= 90 ? "#22c55e" : score >= 70 ? "#06b6d4" : score >= 40 ? "#f97316" : "#ef4444";

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
        <div style={{ fontSize: "40px", fontWeight: "bold", color: "#f1f5f9", marginBottom: "32px" }}>
          MEV Transparency Report
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 64px", borderRadius: "16px", border: "1px solid #1e293b", background: "#111827", marginBottom: "24px" }}>
          <div style={{ fontSize: "72px", fontWeight: "bold", color: scoreColor }}>{score}</div>
          <div style={{ fontSize: "18px", color: "#94a3b8", marginTop: "4px" }}>MEV Protection Score</div>
        </div>
        <div style={{ display: "flex", gap: "32px" }}>
          <div style={{ fontSize: "16px", color: "#94a3b8" }}>Sandwich Attacks: {sandwichCount}</div>
          <div style={{ fontSize: "16px", color: "#94a3b8" }}>Frontrun Events: {frontrunCount}</div>
        </div>
        <div style={{ position: "absolute", bottom: "24px", fontSize: "14px", color: "#475569" }}>
          Data by FogoScope
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
