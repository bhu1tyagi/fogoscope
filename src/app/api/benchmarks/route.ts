import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { fogoConnection } from "@/lib/blockchain/connection";
import { getOrFetch, getCached, CacheTier } from "@/lib/redis/cache";
import { fetchChainComparisons } from "@/lib/blockchain/chain-comparisons";
import type { ChainComparison } from "@/types/metrics";

export const dynamic = "force-dynamic";

interface BenchmarkData {
  currentBlockTimeMs: number;
  avg24hBlockTimeMs: number;
  min24hBlockTimeMs: number;
  max24hBlockTimeMs: number;
  sub50msStreak: number;
  sub50msStreakActive: boolean;
  blockTimeHistory: { time: string; value: number }[];
  chains: ChainComparison[];
}

/**
 * Get live block time from multiple sources with fallback chain:
 * 1. Redis rt:block:latest (if worker is running and value > 0)
 * 2. RPC getRecentPerformanceSamples (average over sample period)
 * 3. Database BlockMetric (average of last 5 minutes)
 * 4. Default 40ms
 */
async function getLiveBlockTimeMs(): Promise<number> {
  // Source 1: Redis real-time cache
  const rtBlock = await getCached<{ blockTimeMs: number; tps: number; updatedAt?: number }>("rt:block:latest");
  if (rtBlock?.blockTimeMs && rtBlock.blockTimeMs > 0) {
    return rtBlock.blockTimeMs;
  }

  // Source 2: RPC performance samples (slot time in ms)
  try {
    const samples = await fogoConnection.getRecentPerformanceSamples(4);
    if (samples.length > 0) {
      const totalSlots = samples.reduce((s, p) => s + p.numSlots, 0);
      const totalSecs = samples.reduce((s, p) => s + p.samplePeriodSecs, 0);
      if (totalSlots > 0 && totalSecs > 0) {
        const msPerSlot = (totalSecs * 1000) / totalSlots;
        if (msPerSlot > 0 && msPerSlot < 10000) return Math.round(msPerSlot * 100) / 100;
      }
    }
  } catch {
    // RPC unavailable
  }

  // Source 3: Recent DB average
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const dbAvg = await prisma.$queryRaw<{ avg: number }[]>`
      SELECT AVG("blockTimeMs")::float as avg FROM "BlockMetric"
      WHERE timestamp > ${fiveMinAgo} AND "blockTimeMs" > 0
    `;
    if (dbAvg[0]?.avg && dbAvg[0].avg > 0) return Math.round(dbAvg[0].avg * 100) / 100;
  } catch {
    // DB unavailable
  }

  return 40; // Last resort default
}

async function fetchBenchmarkData(): Promise<BenchmarkData> {
  const now = new Date();
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get live block time from multiple sources
  const currentBlockTimeMs = await getLiveBlockTimeMs();

  // Get TPS from Redis for chain comparisons
  const rtBlock = await getCached<{ tps: number }>("rt:block:latest");

  // Get 24h stats, block time history, and streak in parallel
  const [stats, history, streakBlocks] = await Promise.all([
    // 24h aggregate stats
    prisma.$queryRaw<{ avg: number; min: number; max: number }[]>`
      SELECT
        AVG("blockTimeMs")::float as avg,
        MIN("blockTimeMs")::float as min,
        MAX("blockTimeMs")::float as max
      FROM "BlockMetric"
      WHERE timestamp > ${h24}
    `,
    // Block time history (5-min buckets)
    prisma.$queryRaw<{ bucket: Date; avg_bt: number }[]>`
      SELECT
        time_bucket('5 minutes', timestamp) AS bucket,
        AVG("blockTimeMs")::float as avg_bt
      FROM "BlockMetric"
      WHERE timestamp > ${h24}
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
    // Streak: get recent blocks ordered by slot desc
    prisma.blockMetric.findMany({
      where: { timestamp: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { slot: "desc" },
      select: { blockTimeMs: true },
      take: 50000,
    }),
  ]);

  // Calculate sub-50ms streak
  let streak = 0;
  for (const block of streakBlocks) {
    if (block.blockTimeMs < 50) {
      streak++;
    } else {
      break;
    }
  }
  const sub50msStreakActive = streakBlocks.length > 0 && streakBlocks[0].blockTimeMs < 50;

  // Format block time history for charts
  const blockTimeHistory = history.map((h) => ({
    time: h.bucket.toISOString(),
    value: Math.round(h.avg_bt * 100) / 100,
  }));

  // Chain comparisons
  const voteAccounts = rtBlock ? { validators: 7 } : { validators: 7 };
  let chains: ChainComparison[] = [];
  try {
    chains = await fetchChainComparisons({
      tps: rtBlock?.tps ?? 0,
      blockTimeMs: currentBlockTimeMs,
      validators: voteAccounts.validators,
    });
  } catch {
    // Fallback static data
    chains = [
      { chain: "Fogo", tps: rtBlock?.tps ?? 0, blockTimeMs: currentBlockTimeMs, finality: "~1.3s", validators: 7, txs24h: 0, live: true },
      { chain: "Solana", tps: 3000, blockTimeMs: 400, finality: "~12s", validators: 1500, txs24h: 0 },
      { chain: "Ethereum", tps: 15, blockTimeMs: 12000, finality: "~13min", validators: 900000, txs24h: 0 },
    ];
  }

  const s = stats[0];

  return {
    currentBlockTimeMs,
    avg24hBlockTimeMs: s?.avg ?? 40,
    min24hBlockTimeMs: s?.min ?? 30,
    max24hBlockTimeMs: s?.max ?? 60,
    sub50msStreak: streak,
    sub50msStreakActive,
    blockTimeHistory,
    chains,
  };
}

export async function GET() {
  try {
    const data = await getOrFetch<BenchmarkData>(
      "api:benchmarks",
      CacheTier.AGGREGATED,
      fetchBenchmarkData
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] /api/benchmarks error:", error);
    return NextResponse.json({ error: "Failed to fetch benchmark data" }, { status: 500 });
  }
}
