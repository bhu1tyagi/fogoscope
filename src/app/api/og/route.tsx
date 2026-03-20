import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "bold",
              color: "#06b6d4",
            }}
          >
            FS
          </div>
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#f1f5f9",
            }}
          >
            FogoScope
          </div>
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#94a3b8",
            marginBottom: "48px",
          }}
        >
          Execution Quality & MEV Transparency for Fogo
        </div>
        <div
          style={{
            display: "flex",
            gap: "32px",
          }}
        >
          {[
            { label: "Block Time", value: "~40ms" },
            { label: "MEV Protection", value: "100/100" },
            { label: "Fair Ordering", value: "Active" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px 32px",
                borderRadius: "12px",
                border: "1px solid #1e293b",
                background: "#111827",
              }}
            >
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#06b6d4" }}>
                {item.value}
              </div>
              <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "14px",
            color: "#475569",
          }}
        >
          Data by FogoScope
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
