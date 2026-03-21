import { NextResponse } from "next/server";
import type { MEVSummary, MEVEvent } from "@/types/metrics";
import prisma from "@/lib/db/prisma";
import { getOrFetch, CacheTier } from "@/lib/redis/cache";
import { VALID_MEV_WHERE } from "@/lib/analytics/mev";

export const dynamic = "force-dynamic";

// Solana MEV rate from Jito/Flashbots research — ~3-5% of transactions are MEV-related.
// Cannot be computed purely from RPC (requires analyzing bundle/sandwich patterns).
// This is the one metric that uses a research-based estimate.
const SOLANA_MEV_BENCHMARK = 3.5;

export async function GET() {
  try {
    const data = await getOrFetch<MEVSummary>(
      "api:mev",
      CacheTier.AGGREGATED,
      async () => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [recentEvents, typeCounts, totalTrades, heatmapRows] =
          await Promise.all([
            // Recent MEV events (last 24h, max 50, excluding deprecated)
            prisma.mEVEvent.findMany({
              where: { timestamp: { gte: twentyFourHoursAgo }, ...VALID_MEV_WHERE },
              orderBy: { timestamp: "desc" },
              take: 50,
            }),

            // Counts grouped by event type (last 24h, excluding deprecated)
            prisma.mEVEvent.groupBy({
              by: ["eventType"],
              where: { timestamp: { gte: twentyFourHoursAgo }, ...VALID_MEV_WHERE },
              _count: { _all: true },
            }),

            // Total trades in last 24h (for percentage calculation)
            prisma.trade.count({
              where: { timestamp: { gte: twentyFourHoursAgo } },
            }),

            // Heatmap data (last 7 days, excluding deprecated)
            prisma.$queryRaw<
              { day: number; hour: number; count: number }[]
            >`SELECT EXTRACT(DOW FROM timestamp)::int as day,
                     EXTRACT(HOUR FROM timestamp)::int as hour,
                     COUNT(*)::int as count
              FROM "MEVEvent"
              WHERE timestamp > ${sevenDaysAgo}
                AND severity NOT IN ('none', 'deprecated')
              GROUP BY day, hour`,
          ]);

        // --- Resolve victim wallets ---
        // Old events may have tx hashes in victimWallet instead of addresses.
        // Look up actual wallets from the Trade table for any that look like tx sigs.
        const victimTxSigs = recentEvents
          .filter((e) => e.relatedTxs.length > 0)
          .map((e) => e.relatedTxs[0]);

        const victimTrades = victimTxSigs.length > 0
          ? await prisma.trade.findMany({
              where: { signature: { in: victimTxSigs } },
              select: { signature: true, wallet: true },
            })
          : [];
        const sigToWallet = new Map(victimTrades.map((t) => [t.signature, t.wallet]));

        // --- Map DB rows → API type ---
        const events: MEVEvent[] = recentEvents.map((e) => {
          // Use stored victimWallet if it looks like a valid address (32-44 base58 chars),
          // otherwise look up from the victim tx signature
          let wallet = e.victimWallet;
          if (wallet && (wallet.length > 50 || wallet.length < 30)) {
            // Likely a tx hash, not a wallet — look up from Trade table
            const victimSig = e.relatedTxs[0];
            wallet = sigToWallet.get(victimSig) ?? null;
          }

          return {
            id: e.id,
            timestamp: e.timestamp.toISOString(),
            type: e.eventType as MEVEvent["type"],
            severity: e.severity as MEVEvent["severity"],
            relatedTxs: e.relatedTxs,
            estimatedProfit: e.estimatedProfit
              ? e.estimatedProfit.toNumber()
              : null,
            victimWallet: wallet,
            description: e.description,
          };
        });

        // --- Aggregate counts from groupBy ---
        const countMap = new Map<string, number>();
        for (const group of typeCounts) {
          countMap.set(group.eventType, group._count._all);
        }

        const sandwichCount = countMap.get("sandwich") ?? 0;
        const frontrunCount = countMap.get("frontrun") ?? 0;
        const arbitrageCount = countMap.get("arbitrage") ?? 0;
        const totalEvents24h = typeCounts.reduce(
          (sum, g) => sum + g._count._all,
          0
        );

        // --- Percentages ---
        const fogoMevPercent =
          totalTrades > 0
            ? +((totalEvents24h / totalTrades) * 100).toFixed(3)
            : 0;
        const solanaMevPercent = SOLANA_MEV_BENCHMARK;

        // --- Score ---
        let score: number;
        if (totalEvents24h === 0) {
          score = 100;
        } else {
          // Weight by severity: high=3, medium=2, low=1, none=0
          const severityWeight: Record<string, number> = {
            high: 3,
            medium: 2,
            low: 1,
            none: 0,
          };
          const totalSeverity = recentEvents.reduce(
            (sum, e) => sum + (severityWeight[e.severity] ?? 0),
            0
          );
          // Each severity point costs 2 points off the score, clamped 0-100
          score = Math.max(0, Math.min(100, 100 - totalSeverity * 2));
        }
        score = +score.toFixed(1);

        // --- Build full 7x24 heatmap grid ---
        const heatmapGrid: { hour: number; day: number; count: number }[] = [];
        const heatmapLookup = new Map<string, number>();
        for (const row of heatmapRows) {
          heatmapLookup.set(`${row.day}-${row.hour}`, row.count);
        }
        for (let day = 0; day < 7; day++) {
          for (let hour = 0; hour < 24; hour++) {
            heatmapGrid.push({
              hour,
              day,
              count: heatmapLookup.get(`${day}-${hour}`) ?? 0,
            });
          }
        }

        return {
          score,
          totalEvents24h,
          sandwichCount,
          frontrunCount,
          arbitrageCount,
          fogoMevPercent,
          solanaMevPercent,
          events,
          heatmap: heatmapGrid,
        } satisfies MEVSummary;
      }
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] /api/mev error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MEV data" },
      { status: 500 }
    );
  }
}
