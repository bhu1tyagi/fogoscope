export const POLLING = {
  LIVE_METRICS: 2_000,
  PRICES: 15_000,
  COMPARISON: 60_000,
  STANDARD: 30_000,
  BRIDGE: 30_000,
} as const;

export const ROUTES = [
  { path: "/", label: "Dashboard", icon: "LayoutDashboard" as const },
  { path: "/execution", label: "Execution Quality", icon: "Zap" as const },
  { path: "/mev", label: "MEV Transparency", icon: "Shield" as const },
  { path: "/compare", label: "Fogo vs Solana", icon: "Swords" as const },
  { path: "/bridge", label: "Bridge Monitor", icon: "ArrowLeftRight" as const },
  { path: "/lending", label: "Lending Health", icon: "Landmark" as const },
  { path: "/network", label: "Network", icon: "Activity" as const },
  { path: "/benchmarks", label: "Benchmarks", icon: "Gauge" as const },
] as const;

export const FOGO_NATIVE_MINT = "So11111111111111111111111111111111111111112";
export const WORMHOLE_FOGO_CHAIN_ID = 51;

export const THEME = {
  colors: {
    fogo: "#06b6d4",
    solana: "#9945FF",
    positive: "#22c55e",
    negative: "#ef4444",
    warning: "#f97316",
  },
} as const;
