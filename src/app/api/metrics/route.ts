import { NextResponse } from "next/server";
import type { DashboardMetrics } from "@/types/metrics";
import { prisma } from "@/lib/db/prisma";
import { fogoConnection } from "@/lib/blockchain/connection";
import { getOrFetch, getCached, CacheTier } from "@/lib/redis/cache";
import { calculateExecutionScore } from "@/lib/analytics/scoring";
import { VALID_MEV_WHERE } from "@/lib/analytics/mev";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await getOrFetch<DashboardMetrics>(
      "api:metrics",
      CacheTier.AGGREGATED,
      fetchMetrics,
    );

    return NextResponse.json(metrics);
  } catch (err) {
    console.error("[api/metrics] Unhandled error:", err);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}

async function fetchMetrics(): Promise<DashboardMetrics> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    realtimeBlock,
    voteAccounts,
    fallbackSlot,
    perfSamples,
    tradeAgg,
    mevCount,
    blockAgg,
  ] = await Promise.all([
    // Realtime block data from Redis (written by BlockMonitor worker)
    getCached<{ slot: number; tps: number; blockTime: number | null }>(
      "rt:block:latest",
    ),

    // Validator info
    fogoConnection.getVoteAccounts(),

    // Fallback slot from RPC
    fogoConnection.getSlot(),

    // Performance samples from RPC (for TPS and block time)
    fogoConnection.getRecentPerformanceSamples(4),

    // Trade aggregates over last 24h
    prisma.trade.aggregate({
      where: { timestamp: { gte: twentyFourHoursAgo } },
      _avg: { slippageBps: true },
      _sum: { amountInUsd: true },
      _count: true,
    }),

    // MEV events in last 24h (excluding deprecated)
    prisma.mEVEvent.count({
      where: { timestamp: { gte: twentyFourHoursAgo }, ...VALID_MEV_WHERE },
    }),

    // Block metrics over last 24h
    prisma.blockMetric.aggregate({
      where: { timestamp: { gte: twentyFourHoursAgo } },
      _avg: { blockTimeMs: true },
      _sum: { totalTxns: true, failedTxns: true },
    }),
  ]);

  // --- Resolve current slot ---
  const currentSlot = realtimeBlock?.slot ?? fallbackSlot;

  // --- Resolve TPS ---
  let tps = 0;
  if (realtimeBlock?.tps) {
    tps = realtimeBlock.tps;
  } else if (perfSamples.length > 0) {
    const sample = perfSamples[0];
    tps =
      sample.samplePeriodSecs > 0
        ? Math.round(sample.numTransactions / sample.samplePeriodSecs)
        : 0;
  }

  // --- Active validators ---
  const activeValidators = voteAccounts.current.length;

  // --- Trade stats (handle empty table) ---
  const totalTrades24h = tradeAgg._count ?? 0;
  const avgSlippageBps =
    tradeAgg._avg.slippageBps !== null
      ? Math.max(0, tradeAgg._avg.slippageBps.toNumber())
      : 0;
  const volume24h =
    tradeAgg._sum.amountInUsd !== null
      ? tradeAgg._sum.amountInUsd.toNumber()
      : 0;

  // --- MEV detected ---
  const mevDetected24h = mevCount;

  // --- Block time: prefer live RPC samples, fall back to Redis, then DB, then default ---
  let avgBlockTimeMs = 40;

  // Source 1: RPC performance samples (most accurate live source)
  if (perfSamples.length > 0) {
    const totalSlots = perfSamples.reduce((s, p) => s + p.numSlots, 0);
    const totalSecs = perfSamples.reduce((s, p) => s + p.samplePeriodSecs, 0);
    if (totalSlots > 0 && totalSecs > 0) {
      const computed = (totalSecs * 1000) / totalSlots;
      if (computed > 0 && computed < 10000) avgBlockTimeMs = Math.round(computed * 100) / 100;
    }
  }

  // Source 2: Redis rt:block:latest (if RPC samples failed)
  if (avgBlockTimeMs === 40 && realtimeBlock) {
    const rt = realtimeBlock as { blockTimeMs?: number };
    if (rt.blockTimeMs && rt.blockTimeMs > 0) avgBlockTimeMs = rt.blockTimeMs;
  }

  // Source 3: DB average (excluding zero values from the old bug)
  if (avgBlockTimeMs === 40) {
    const dbAvg = blockAgg._avg.blockTimeMs ?? 0;
    if (dbAvg > 0) avgBlockTimeMs = dbAvg;
  }

  // --- Trade failure rate from block metrics ---
  const totalTxns = blockAgg._sum.totalTxns ?? 0;
  const failedTxns = blockAgg._sum.failedTxns ?? 0;
  const tradeFailureRate =
    totalTxns > 0 ? failedTxns / totalTxns : 0;

  // --- MEV events per tx ---
  const mevEventsPerTx = totalTrades24h > 0 ? mevDetected24h / totalTrades24h : 0;

  // --- Execution score ---
  const executionScore = calculateExecutionScore({
    avgSlippageBps,
    mevEventsPerTx,
    avgLatencyMs: avgBlockTimeMs,
    tradeFailureRate,
    avgPriorityFee: 0, // priority fee tracking not yet implemented
  });

  // --- Fogo vs Solana comparison (% faster) ---
  // Compute from real RPC data: how much faster Fogo is vs Solana in confirmation time
  let fogoVsSolanaPercent = 0;
  try {
    // First try CrossChainComparison table
    const latestComparison = await prisma.crossChainComparison.findFirst({
      orderBy: { timestamp: "desc" },
      select: { improvementBps: true },
    });
    if (latestComparison) {
      fogoVsSolanaPercent = latestComparison.improvementBps.toNumber() / 100;
    } else {
      // Fall back: compute from RPC performance samples
      const { solanaConnection } = await import("@/lib/blockchain/connection");
      const solanaSamples = await solanaConnection.getRecentPerformanceSamples(1);
      if (solanaSamples.length > 0 && perfSamples.length > 0) {
        const solBlockMs = solanaSamples[0].numSlots > 0
          ? (solanaSamples[0].samplePeriodSecs * 1000) / solanaSamples[0].numSlots
          : 400;
        const fogoBlockMs = perfSamples[0].numSlots > 0
          ? (perfSamples[0].samplePeriodSecs * 1000) / perfSamples[0].numSlots
          : avgBlockTimeMs;
        if (solBlockMs > 0) {
          fogoVsSolanaPercent = +((1 - fogoBlockMs / solBlockMs) * 100).toFixed(1);
        }
      }
    }
  } catch {
    fogoVsSolanaPercent = 0;
  }

  return {
    executionScore,
    avgSlippageBps,
    mevDetected24h,
    avgBlockTimeMs,
    volume24h,
    fogoVsSolanaPercent,
    tps,
    activeValidators,
    currentSlot,
    totalTrades24h,
  };
}
