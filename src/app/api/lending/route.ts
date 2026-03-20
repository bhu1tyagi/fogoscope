import { NextResponse } from "next/server";
import type { LendingSummary, LendingPosition } from "@/types/metrics";
import prisma from "@/lib/db/prisma";
import { getOrFetch, CacheTier } from "@/lib/redis/cache";

export const dynamic = "force-dynamic";

/** Rough USD price for token conversion. */
function tokenPriceUsd(token: string): number {
  const normalized = token.toLowerCase();
  if (normalized.includes("usdc") || normalized.includes("usdt")) return 1;
  // FOGO, stFOGO, iFOGO all roughly $1.25
  return 1.25;
}

export async function GET() {
  try {
    const data = await getOrFetch<LendingSummary>(
      "api:lending",
      CacheTier.AGGREGATED,
      async () => {
        const rows = await prisma.lendingPosition.findMany({
          orderBy: { healthFactor: "asc" },
        });

        if (rows.length === 0) {
          return {
            positionsAtRisk: 0,
            totalValueAtRisk: 0,
            positions: [],
            healthDistribution: [],
            marketHealth: [],
          };
        }

        // Map Decimal fields to plain numbers
        const positions: LendingPosition[] = rows.map((r) => ({
          id: r.id,
          protocol: r.protocol,
          wallet: r.wallet,
          collateralToken: r.collateralToken,
          collateralAmount: Number(r.collateralAmount),
          borrowToken: r.borrowToken,
          borrowAmount: Number(r.borrowAmount),
          healthFactor: Number(r.healthFactor),
          liquidationPrice: r.liquidationPrice !== null ? Number(r.liquidationPrice) : null,
        }));

        // Positions at risk: health factor < 1.2
        const atRisk = positions.filter((p) => p.healthFactor < 1.2);
        const positionsAtRisk = atRisk.length;

        // Total value at risk in USD
        const totalValueAtRisk = +atRisk
          .reduce((sum, p) => sum + p.collateralAmount * tokenPriceUsd(p.collateralToken), 0)
          .toFixed(2);

        // Health distribution buckets
        const healthDistribution = [
          { bucket: "< 1.0 (liquidatable)", count: positions.filter((p) => p.healthFactor < 1.0).length },
          { bucket: "1.0 - 1.2 (at risk)", count: positions.filter((p) => p.healthFactor >= 1.0 && p.healthFactor < 1.2).length },
          { bucket: "1.2 - 1.5 (watch)", count: positions.filter((p) => p.healthFactor >= 1.2 && p.healthFactor < 1.5).length },
          { bucket: "1.5 - 2.0 (moderate)", count: positions.filter((p) => p.healthFactor >= 1.5 && p.healthFactor < 2.0).length },
          { bucket: "2.0 - 3.0 (healthy)", count: positions.filter((p) => p.healthFactor >= 2.0 && p.healthFactor < 3.0).length },
          { bucket: "3.0+ (very safe)", count: positions.filter((p) => p.healthFactor >= 3.0).length },
        ];

        // Market health: group by collateralToken
        const marketMap = new Map<
          string,
          { totalHealth: number; totalBorrow: number; totalCollateral: number; count: number }
        >();
        for (const p of positions) {
          const key = p.collateralToken;
          const existing = marketMap.get(key) ?? {
            totalHealth: 0,
            totalBorrow: 0,
            totalCollateral: 0,
            count: 0,
          };
          existing.totalHealth += p.healthFactor;
          existing.totalBorrow += p.borrowAmount;
          existing.totalCollateral += p.collateralAmount;
          existing.count += 1;
          marketMap.set(key, existing);
        }

        const marketHealth = Array.from(marketMap.entries()).map(([market, stats]) => ({
          market,
          healthFactor: +(stats.totalHealth / stats.count).toFixed(2),
          utilization:
            stats.totalCollateral > 0
              ? +((stats.totalBorrow / stats.totalCollateral) * 100).toFixed(1)
              : 0,
        }));

        return {
          positionsAtRisk,
          totalValueAtRisk,
          positions,
          healthDistribution,
          marketHealth,
        };
      }
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] /api/lending error:", error);
    return NextResponse.json(
      { message: "Failed to fetch lending data", code: "INTERNAL_ERROR", status: 500 },
      { status: 500 }
    );
  }
}
