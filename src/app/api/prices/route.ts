import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getOrFetch, CacheTier } from "@/lib/redis/cache";
import type { TokenPrice } from "@/types/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prices = await getOrFetch<TokenPrice[]>(
      "api:prices",
      CacheTier.REALTIME,
      async () => {
        // Get the latest price for each unique (chain, symbol) pair
        const rows = await prisma.$queryRaw<
          {
            token: string;
            symbol: string;
            priceUsd: number;
            change24h: number | null;
            volume24h: number | null;
            liquidity: number | null;
          }[]
        >`
          SELECT DISTINCT ON (chain, symbol)
            token,
            symbol,
            "priceUsd"::float as "priceUsd",
            "change24h"::float as "change24h",
            "volume24h"::float as "volume24h",
            liquidity::float as liquidity
          FROM "TokenPrice"
          WHERE chain = 'fogo'
          ORDER BY chain, symbol, timestamp DESC
        `;

        if (rows.length === 0) return [];

        return rows.map((row) => ({
          mint: row.token,
          symbol: row.symbol,
          priceUsd: row.priceUsd ?? 0,
          change24h: row.change24h ?? 0,
          volume24h: row.volume24h ?? 0,
          liquidity: row.liquidity ?? 0,
        }));
      }
    );

    return NextResponse.json(prices);
  } catch (error) {
    console.error("[API] /api/prices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
