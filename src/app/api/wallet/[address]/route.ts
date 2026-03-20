import { NextRequest, NextResponse } from "next/server";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { WalletAnalysis, TradeRecord, WalletTokenBalance, WalletTransaction } from "@/types/metrics";
import type { TimeSeries } from "@/types/common";
import prisma from "@/lib/db/prisma";
import { fogoConnection } from "@/lib/blockchain/connection";
import { MINT_SYMBOLS } from "@/lib/blockchain/program-ids";
import { getOrFetch, CacheTier, getCached } from "@/lib/redis/cache";
import { calculateExecutionScore } from "@/lib/analytics/scoring";

export const dynamic = "force-dynamic";

/**
 * Derive a buy/sell side from the pair string and tokenIn.
 * For a pair like "FOGO/USDC.s", buying means tokenIn is the quote (USDC.s).
 */
function deriveSide(pair: string, tokenIn: string): "buy" | "sell" {
  const [, quote] = pair.split("/");
  return quote && tokenIn.toLowerCase() === quote.toLowerCase() ? "buy" : "sell";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!address || address.length < 32 || address.length > 44) {
    return NextResponse.json(
      { message: "Invalid wallet address", code: "INVALID_ADDRESS", status: 400 },
      { status: 400 }
    );
  }

  try {
    const data = await getOrFetch<WalletAnalysis>(
      `api:wallet:${address}`,
      CacheTier.HISTORICAL,
      async () => {
        const [trades, agg, topDex, sessionCount, slippageHistoryRaw] =
          await Promise.all([
            // Recent trades (up to 50)
            prisma.trade.findMany({
              where: { wallet: address },
              orderBy: { timestamp: "desc" },
              take: 50,
            }),

            // Aggregate stats
            prisma.trade.aggregate({
              where: { wallet: address },
              _avg: { slippageBps: true },
              _min: { slippageBps: true },
              _max: { slippageBps: true },
              _sum: { amountInUsd: true },
              _count: true,
            }),

            // Preferred DEX (top 1 by trade count)
            prisma.trade.groupBy({
              by: ["dex"],
              where: { wallet: address },
              _count: { _all: true },
              orderBy: { _count: { dex: "desc" } },
              take: 1,
            }),

            // Session trade count
            prisma.trade.count({
              where: { wallet: address, isSession: true },
            }),

            // Slippage history (hourly buckets for last 7 days)
            prisma.$queryRaw<{ bucket: Date; avg_slippage: number }[]>`
              SELECT time_bucket('1 hour', timestamp) as bucket,
                     AVG("slippageBps") as avg_slippage
              FROM "Trade"
              WHERE wallet = ${address}
                AND timestamp > NOW() - INTERVAL '7 days'
                AND "slippageBps" IS NOT NULL
              GROUP BY bucket
              ORDER BY bucket
            `,
          ]);

        // --- Fetch on-chain data (always, regardless of trade history) ---
        const onChain = await fetchOnChainData(address);

        // No DEX trades — return on-chain data with zeroed trade metrics
        if (trades.length === 0 && agg._count === 0) {
          return {
            address,
            solBalance: onChain.solBalance,
            tokens: onChain.tokens,
            recentTransactions: onChain.recentTransactions,
            executionScore: 0,
            totalTrades: 0,
            avgSlippageBps: 0,
            worstSlippageBps: 0,
            bestSlippageBps: 0,
            totalVolumeUsd: 0,
            preferredDex: "",
            sessionUsageRate: 0,
            trades: [],
            slippageHistory: [],
          };
        }

        // Map DB rows -> TradeRecord (Decimal -> number)
        const mappedTrades: TradeRecord[] = trades.map((t) => ({
          id: t.id,
          signature: t.signature,
          timestamp: t.timestamp.toISOString(),
          dex: t.dex,
          pair: t.pair,
          side: deriveSide(t.pair, t.tokenIn),
          amountIn: Number(t.amountIn),
          amountOut: Number(t.amountOut),
          amountInUsd: t.amountInUsd !== null ? Number(t.amountInUsd) : 0,
          amountOutUsd: t.amountOutUsd !== null ? Number(t.amountOutUsd) : 0,
          expectedOut: t.expectedOut !== null ? Number(t.expectedOut) : null,
          slippageBps: t.slippageBps !== null ? Number(t.slippageBps) : null,
          priceImpact: t.priceImpact !== null ? Number(t.priceImpact) : null,
          executionTimeMs: t.executionTimeMs,
          executionQuality: t.executionQuality,
          wallet: t.wallet,
          isSession: t.isSession,
        }));

        const avgSlippageBps = agg._avg.slippageBps !== null ? Number(agg._avg.slippageBps) : 0;
        const worstSlippageBps = agg._max.slippageBps !== null ? Number(agg._max.slippageBps) : 0;
        const bestSlippageBps = agg._min.slippageBps !== null ? Number(agg._min.slippageBps) : 0;
        const totalVolumeUsd = agg._sum.amountInUsd !== null ? Number(agg._sum.amountInUsd) : 0;
        const totalTrades = agg._count;
        const preferredDex = topDex.length > 0 ? topDex[0].dex : "";

        const sessionUsageRate =
          totalTrades > 0 ? +((sessionCount / totalTrades) * 100).toFixed(1) : 0;

        // Compute average latency from the fetched trades (for scoring)
        const latencies = mappedTrades
          .map((t) => t.executionTimeMs)
          .filter((v): v is number => v !== null);
        const avgLatencyMs =
          latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;

        // Compute average fee from fetched trades
        const fees = trades
          .map((t) => (t.fee !== null ? Number(t.fee) : null))
          .filter((v): v is number => v !== null);
        const avgPriorityFee =
          fees.length > 0 ? fees.reduce((a, b) => a + b, 0) / fees.length : 0;

        const executionScore = calculateExecutionScore({
          avgSlippageBps,
          mevEventsPerTx: 0, // MEV data not available per-wallet here
          avgLatencyMs,
          tradeFailureRate: 0, // Only successful trades are stored
          avgPriorityFee,
        });

        // Map slippage history to TimeSeries
        const slippageHistory: TimeSeries[] = (slippageHistoryRaw ?? []).map((row) => ({
          time: new Date(row.bucket).toISOString(),
          value: +Number(row.avg_slippage).toFixed(2),
        }));

        return {
          address,
          solBalance: onChain.solBalance,
          tokens: onChain.tokens,
          recentTransactions: onChain.recentTransactions,
          executionScore,
          totalTrades,
          avgSlippageBps: +avgSlippageBps.toFixed(2),
          worstSlippageBps: +worstSlippageBps.toFixed(2),
          bestSlippageBps: +bestSlippageBps.toFixed(2),
          totalVolumeUsd: +totalVolumeUsd.toFixed(2),
          preferredDex,
          sessionUsageRate,
          trades: mappedTrades,
          slippageHistory,
        };
      }
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API] /api/wallet/${address} error:`, error);
    return NextResponse.json(
      { message: "Failed to fetch wallet data", code: "INTERNAL_ERROR", status: 500 },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Fetch on-chain wallet data from Fogo RPC
// ---------------------------------------------------------------------------

async function fetchOnChainData(address: string): Promise<{
  solBalance: number;
  tokens: WalletTokenBalance[];
  recentTransactions: WalletTransaction[];
}> {
  const pubkey = new PublicKey(address);

  try {
    const [balanceLamports, tokenAccounts, signatures] = await Promise.all([
      // Native SOL/FOGO balance
      fogoConnection.getBalance(pubkey),

      // SPL token accounts
      fogoConnection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      }),

      // Recent transaction signatures
      fogoConnection.getSignaturesForAddress(pubkey, { limit: 20 }),
    ]);

    // --- Token balances ---
    const tokens: WalletTokenBalance[] = [];
    for (const account of tokenAccounts.value) {
      const parsed = account.account.data.parsed.info;
      const mint: string = parsed.mint;
      const amount = parseFloat(parsed.tokenAmount.uiAmountString ?? "0");
      const decimals: number = parsed.tokenAmount.decimals;

      if (amount === 0) continue;

      const symbol = MINT_SYMBOLS[mint] ?? mint.slice(0, 8);

      // Try to get USD price from Redis cache
      let usdValue: number | null = null;
      try {
        const cached = await getCached<{ priceUsd: number }>(`rt:price:fogo:${mint}`);
        if (cached?.priceUsd) {
          usdValue = +(amount * cached.priceUsd).toFixed(2);
        }
      } catch {
        // ignore
      }

      tokens.push({ mint, symbol, amount, decimals, usdValue });
    }

    // Sort by USD value (highest first), then by amount
    tokens.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0) || b.amount - a.amount);

    // --- Recent transactions ---
    const recentTransactions: WalletTransaction[] = signatures.map((sig) => ({
      signature: sig.signature,
      slot: sig.slot,
      timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
      success: sig.err === null,
      type: sig.memo ?? "transaction",
    }));

    return {
      solBalance: balanceLamports / LAMPORTS_PER_SOL,
      tokens,
      recentTransactions,
    };
  } catch (err) {
    console.error(`[wallet] On-chain fetch failed for ${address}:`, err);
    return { solBalance: 0, tokens: [], recentTransactions: [] };
  }
}
