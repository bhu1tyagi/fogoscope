import type { TimeSeries } from "./common";

export interface DashboardMetrics {
  executionScore: number;
  avgSlippageBps: number;
  mevDetected24h: number;
  avgBlockTimeMs: number;
  volume24h: number;
  fogoVsSolanaPercent: number;
  tps: number;
  activeValidators: number;
  currentSlot: number;
  totalTrades24h: number;
}

export interface TradeRecord {
  id: string;
  signature: string;
  timestamp: string;
  dex: string;
  pair: string;
  side: "buy" | "sell";
  amountIn: number;
  amountOut: number;
  amountInUsd: number;
  amountOutUsd: number;
  expectedOut: number | null;
  slippageBps: number | null;
  priceImpact: number | null;
  executionTimeMs: number | null;
  executionQuality: number | null;
  wallet: string;
  isSession: boolean;
}

export interface SlippageData {
  avgSlippageBps: number;
  medianSlippageBps: number;
  p95SlippageBps: number;
  timeSeries: TimeSeries[];
  distribution: { bucket: string; count: number }[];
  byPair: { pair: string; avgSlippage: number }[];
  bySize: { size: number; slippage: number }[];
}

export interface MEVEvent {
  id: string;
  timestamp: string;
  type: "sandwich" | "frontrun" | "arbitrage" | "oracle_deviation" | "none_detected";
  severity: "none" | "low" | "medium" | "high";
  relatedTxs: string[];
  estimatedProfit: number | null;
  victimWallet: string | null;
  description: string | null;
}

export interface MEVSummary {
  score: number;
  totalEvents24h: number;
  sandwichCount: number;
  frontrunCount: number;
  arbitrageCount: number;
  fogoMevPercent: number;
  solanaMevPercent: number;
  events: MEVEvent[];
  heatmap: { hour: number; day: number; count: number }[];
}

export interface ComparisonData {
  pair: string;
  fogo: {
    slippageBps: number;
    confirmationMs: number;
    mevPercent: number;
    failureRate: number;
    avgPriorityFee: number;
    bestExecRate: number;
    tps: number;
    blockTimeMs: number;
  };
  solana: {
    slippageBps: number;
    confirmationMs: number;
    mevPercent: number;
    failureRate: number;
    avgPriorityFee: number;
    bestExecRate: number;
    tps: number;
    blockTimeMs: number;
  };
  history: { time: string; fogoSlippage: number; solanaSlippage: number }[];
}

export interface BridgeTransfer {
  id: string;
  timestamp: string;
  direction: "inbound" | "outbound";
  sourceChain: string;
  destChain: string;
  token: string;
  amount: number;
  amountUsd: number;
  sender: string;
  recipient: string;
  status: "pending" | "completed" | "failed";
  vaaId: string;
}

export interface BridgeSummary {
  inflow24h: number;
  outflow24h: number;
  netFlow: number;
  avgTransferSize: number;
  uniqueAddresses: number;
  transfers: BridgeTransfer[];
  flowByChain: { chain: string; inflow: number; outflow: number }[];
}

export interface LendingPosition {
  id: string;
  protocol: string;
  wallet: string;
  collateralToken: string;
  collateralAmount: number;
  borrowToken: string;
  borrowAmount: number;
  healthFactor: number;
  liquidationPrice: number | null;
}

export interface LendingSummary {
  positionsAtRisk: number;
  totalValueAtRisk: number;
  positions: LendingPosition[];
  healthDistribution: { bucket: string; count: number }[];
  marketHealth: { market: string; healthFactor: number; utilization: number }[];
}

export interface ChainComparison {
  chain: string;
  tps: number;
  blockTimeMs: number;
  finality: string;
  validators: number;
  txs24h: number;
  live?: boolean;
}

export interface NetworkStats {
  currentTps: number;
  avgBlockTimeMs: number;
  activeValidators: number;
  currentEpoch: number;
  epochProgress: number;
  currentSlot: number;
  txSuccess24h: number;
  totalTx24h: number;
  tvlUsd: number;
  tpsHistory: TimeSeries[];
  blockTimeHistory: TimeSeries[];
  chains?: ChainComparison[];
}

export interface WalletTokenBalance {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue: number | null;
}

export interface WalletTransaction {
  signature: string;
  slot: number;
  timestamp: string | null;
  success: boolean;
  type: string;
}

export interface WalletAnalysis {
  address: string;
  solBalance: number;
  tokens: WalletTokenBalance[];
  recentTransactions: WalletTransaction[];
  executionScore: number;
  totalTrades: number;
  avgSlippageBps: number;
  worstSlippageBps: number;
  bestSlippageBps: number;
  totalVolumeUsd: number;
  preferredDex: string;
  sessionUsageRate: number;
  trades: TradeRecord[];
  slippageHistory: TimeSeries[];
}

export interface TokenPrice {
  mint: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
}
