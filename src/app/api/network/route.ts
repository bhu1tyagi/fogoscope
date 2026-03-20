import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { NetworkStats, ChainComparison } from "@/types/metrics";
import prisma from "@/lib/db/prisma";
import { fogoConnection, solanaConnection } from "@/lib/blockchain/connection";
import { getOrFetch, getCached, CacheTier } from "@/lib/redis/cache";
import { getFogoTVL } from "@/lib/external/defi-llama";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getOrFetch<NetworkStats>(
      "api:network",
      CacheTier.REALTIME,
      async () => {
        const [
          realtimeBlock,
          epochInfo,
          currentSlot,
          voteAccounts,
          perfSamples,
          tvlUsd,
          tpsRows,
          blockTimeRows,
          txSummaryRows,
        ] = await Promise.all([
          // Redis realtime cache for latest block data
          getCached<{ slot: number; tps: number; blockTime: number | null }>(
            "rt:block:latest"
          ),

          // Epoch info from RPC
          fogoConnection.getEpochInfo(),

          // Current slot
          fogoConnection.getSlot(),

          // Vote accounts for active validator count
          fogoConnection.getVoteAccounts(),

          // Performance samples from RPC (for TPS and block time)
          fogoConnection.getRecentPerformanceSamples(4),

          // TVL from DeFi Llama
          getFogoTVL(),

          // TPS history: 24h, 15-min buckets
          prisma.$queryRaw<
            { bucket: Date; avg_tps: number | Prisma.Decimal | null }[]
          >(
            Prisma.sql`
              SELECT time_bucket('15 minutes', timestamp) AS bucket, AVG(tps) as avg_tps
              FROM "BlockMetric"
              WHERE timestamp > NOW() - INTERVAL '24 hours'
              GROUP BY bucket ORDER BY bucket ASC
            `
          ),

          // Block time history: 24h, 15-min buckets
          prisma.$queryRaw<
            {
              bucket: Date;
              avg_block_time: number | Prisma.Decimal | null;
            }[]
          >(
            Prisma.sql`
              SELECT time_bucket('15 minutes', timestamp) AS bucket, AVG("blockTimeMs") as avg_block_time
              FROM "BlockMetric"
              WHERE timestamp > NOW() - INTERVAL '24 hours'
              GROUP BY bucket ORDER BY bucket ASC
            `
          ),

          // Transaction success/total for 24h
          prisma.$queryRaw<
            { total: bigint | number; success: bigint | number }[]
          >(
            Prisma.sql`
              SELECT COALESCE(SUM("totalTxns"), 0) as total, COALESCE(SUM("totalTxns" - "failedTxns"), 0) as success
              FROM "BlockMetric"
              WHERE timestamp > NOW() - INTERVAL '24 hours'
            `
          ),
        ]);

        // Determine TPS: prefer Redis cache, fall back to performance samples
        let currentTps = 0;
        if (realtimeBlock?.tps != null) {
          currentTps = realtimeBlock.tps;
        } else if (perfSamples.length > 0) {
          const sample = perfSamples[0];
          currentTps =
            sample.numTransactions / Math.max(sample.samplePeriodSecs, 1);
        }

        // Determine avg block time: prefer RPC performance samples (most accurate),
        // fall back to Redis, then 40ms default
        let avgBlockTimeMs = 40;
        if (perfSamples.length > 0) {
          const totalSlots = perfSamples.reduce((s, p) => s + p.numSlots, 0);
          const totalSecs = perfSamples.reduce((s, p) => s + p.samplePeriodSecs, 0);
          if (totalSlots > 0 && totalSecs > 0) {
            const computed = (totalSecs * 1000) / totalSlots;
            if (computed > 0 && computed < 10000) avgBlockTimeMs = Math.round(computed * 100) / 100;
          }
        }
        if (avgBlockTimeMs === 40 && realtimeBlock && "blockTimeMs" in realtimeBlock) {
          const rt = realtimeBlock as Record<string, unknown>;
          if (rt.blockTimeMs && (rt.blockTimeMs as number) > 0) avgBlockTimeMs = rt.blockTimeMs as number;
        }

        // Active validators
        const activeValidators = voteAccounts.current.length;

        // Epoch progress
        const epochProgress =
          epochInfo.slotsInEpoch > 0
            ? epochInfo.slotIndex / epochInfo.slotsInEpoch
            : 0;

        // Transaction counts from raw SQL (BigInt -> Number conversion)
        const txSummary = txSummaryRows[0];
        const totalTx24h = txSummary ? Number(txSummary.total) : 0;
        const txSuccess24h = txSummary ? Number(txSummary.success) : 0;

        // TPS history (Decimal -> Number conversion)
        const tpsHistory =
          tpsRows.length > 0
            ? tpsRows.map((row) => ({
                time: new Date(row.bucket).toISOString(),
                value: Number(row.avg_tps ?? 0),
              }))
            : [];

        // Block time history (Decimal -> Number conversion, filter out 0 values)
        const blockTimeHistory =
          blockTimeRows.length > 0
            ? blockTimeRows
                .map((row) => ({
                  time: new Date(row.bucket).toISOString(),
                  value: Number(row.avg_block_time ?? 0),
                }))
                .filter((row) => row.value > 0)
            : [];

        // --- Chain comparison data ---
        const chains = await fetchChainComparisons({
          fogoTps: currentTps,
          fogoBlockTimeMs: avgBlockTimeMs,
          fogoValidators: activeValidators,
          fogoTxs24h: totalTx24h,
        });

        return {
          currentTps,
          avgBlockTimeMs,
          activeValidators,
          currentEpoch: epochInfo.epoch,
          epochProgress,
          currentSlot,
          txSuccess24h,
          totalTx24h,
          tvlUsd,
          tpsHistory,
          blockTimeHistory,
          chains,
        } satisfies NetworkStats;
      }
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API] /api/network error:", err);
    return NextResponse.json(
      { error: "Failed to fetch network stats" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Chain comparison data — live Solana, cached Ethereum/Hyperliquid
// ---------------------------------------------------------------------------

async function fetchChainComparisons(fogo: {
  fogoTps: number;
  fogoBlockTimeMs: number;
  fogoValidators: number;
  fogoTxs24h: number;
}): Promise<ChainComparison[]> {
  const chains: ChainComparison[] = [];

  // Fogo (live)
  // Compute 24h txns from TPS * 86400 for consistency with other chains.
  // All chains report total TPS (including votes/oracle), so this is apples-to-apples.
  const fogoTxs24h = Math.round(fogo.fogoTps * 86400);

  chains.push({
    chain: "Fogo",
    tps: Math.round(fogo.fogoTps),
    blockTimeMs: Math.round(fogo.fogoBlockTimeMs),
    finality: "~400ms",
    validators: fogo.fogoValidators,
    txs24h: fogoTxs24h,
    live: true,
  });

  // Solana (live from RPC)
  try {
    const [solanaSamples, solanaVoteAccounts] = await Promise.all([
      solanaConnection.getRecentPerformanceSamples(1),
      solanaConnection.getVoteAccounts(),
    ]);

    const solanaSample = solanaSamples[0];
    const solanaTps = solanaSample
      ? Math.round(solanaSample.numTransactions / solanaSample.samplePeriodSecs)
      : 4000;
    const solanaBlockTimeMs = solanaSample && solanaSample.numSlots > 0
      ? Math.round((solanaSample.samplePeriodSecs * 1000) / solanaSample.numSlots)
      : 400;
    const solanaValidators = solanaVoteAccounts.current.length;
    // Use TPS * 86400 for consistency (total txns including votes, same as all chains)
    const solanaTxs24h = Math.round(solanaTps * 86400);

    chains.push({
      chain: "Solana",
      tps: solanaTps,
      blockTimeMs: solanaBlockTimeMs,
      finality: "~12s",
      validators: solanaValidators,
      txs24h: solanaTxs24h,
      live: true,
    });
  } catch {
    // Fallback to approximate values
    chains.push({
      chain: "Solana",
      tps: 4000,
      blockTimeMs: 400,
      finality: "~12s",
      validators: 1900,
      txs24h: 250_000_000,
    });
  }

  // Ethereum — fetch live from public RPC
  try {
    const ethBlockRes = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    });
    if (ethBlockRes.ok) {
      const ethBlockData = await ethBlockRes.json();
      const ethBlockNum = parseInt(ethBlockData.result, 16);

      // Fetch latest block to get tx count
      const ethBlock = await fetch("https://eth.llamarpc.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber",
          params: [ethBlockData.result, false],
        }),
      });
      const ethBlockInfo = await ethBlock.json();
      const txCount = ethBlockInfo.result?.transactions?.length ?? 150;
      // Ethereum: ~12s blocks, so TPS ≈ txCount / 12
      const ethTps = Math.round(txCount / 12);
      // ~7200 blocks/day * txCount = daily txns
      const ethTxs24h = Math.round(txCount * 7200);

      chains.push({
        chain: "Ethereum",
        tps: ethTps,
        blockTimeMs: 12000,
        finality: "~15min",
        validators: 1_000_000,
        txs24h: ethTxs24h,
        live: true,
      });
    } else {
      throw new Error("ETH RPC failed");
    }
  } catch {
    chains.push({
      chain: "Ethereum",
      tps: 15,
      blockTimeMs: 12000,
      finality: "~15min",
      validators: 1_000_000,
      txs24h: 1_100_000,
    });
  }

  // Hyperliquid — live from public APIs
  try {
    const [hlValidators, hlStats] = await Promise.all([
      // Validator count from info API
      fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "validatorSummaries" }),
      }).then((r) => r.ok ? r.json() : null),

      // Global stats (daily volume, users)
      fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "globalStats" }),
      }).then((r) => r.ok ? r.json() : null),
    ]);

    const validatorCount = Array.isArray(hlValidators) ? hlValidators.length : 4;
    // dailyVolume is in USD; estimate tx count from typical $50 avg trade size
    const dailyVolume = hlStats?.dailyVolume ?? 0;
    const estimatedTxs24h = dailyVolume > 0 ? Math.round(dailyVolume / 50) : 100_000_000;
    // TPS from estimated 24h txns
    const hlTps = Math.round(estimatedTxs24h / 86400);

    chains.push({
      chain: "Hyperliquid",
      tps: hlTps,
      blockTimeMs: 200, // L1 native block time (~200ms) — not available from EVM RPC
      finality: "~1s",
      validators: validatorCount,
      txs24h: estimatedTxs24h,
      live: true,
    });
  } catch {
    chains.push({
      chain: "Hyperliquid",
      tps: 200_000,
      blockTimeMs: 200,
      finality: "~1s",
      validators: 4,
      txs24h: 100_000_000,
    });
  }

  return chains;
}
