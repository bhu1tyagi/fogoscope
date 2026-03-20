import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { getOrFetch, CacheTier } from "@/lib/redis/cache";
import type { TimeSeries } from "@/types/common";
import type { SlippageData } from "@/types/metrics";

export const dynamic = "force-dynamic";

const INTERVAL_MAP: Record<string, { interval: string; bucket: string }> = {
  "1h":  { interval: "1 hour",   bucket: "5 minutes"  },
  "4h":  { interval: "4 hours",  bucket: "10 minutes" },
  "24h": { interval: "24 hours", bucket: "30 minutes" },
  "7d":  { interval: "7 days",   bucket: "1 hour"     },
  "30d": { interval: "30 days",  bucket: "4 hours"    },
};

const VALID_TIME_RANGES = new Set(Object.keys(INTERVAL_MAP));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let timeRange = searchParams.get("timeRange") ?? "24h";

    if (!VALID_TIME_RANGES.has(timeRange)) {
      timeRange = "24h";
    }

    const data = await getOrFetch<SlippageData>(
      `api:slippage:${timeRange}`,
      CacheTier.AGGREGATED,
      () => fetchSlippageData(timeRange)
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Slippage API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch slippage data" },
      { status: 500 }
    );
  }
}

async function fetchSlippageData(timeRange: string): Promise<SlippageData> {
  const { interval, bucket } = INTERVAL_MAP[timeRange];

  // Use Prisma.raw for interval/bucket since Prisma doesn't support parameterized intervals.
  // Safe because `interval` and `bucket` are from the validated whitelist above.
  const sqlInterval = Prisma.raw(`'${interval}'`);
  const sqlBucket = Prisma.raw(`'${bucket}'`);

  const [statsRows, timeSeriesRows, distributionRows, byPairRows, bySizeRows] =
    await Promise.all([
      // (a) Stats: avg, median, p95
      prisma.$queryRaw<
        { avg: number | null; median: number | null; p95: number | null }[]
      >(
        Prisma.sql`
          SELECT
            AVG("slippageBps") as avg,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "slippageBps") as median,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "slippageBps") as p95
          FROM "Trade"
          WHERE "timestamp" > NOW() - INTERVAL ${sqlInterval}
            AND "slippageBps" IS NOT NULL
        `
      ),

      // (b) Time series
      prisma.$queryRaw<{ bucket: Date; avg_slippage: number | null }[]>(
        Prisma.sql`
          SELECT
            time_bucket(${sqlBucket}, "timestamp") AS bucket,
            AVG("slippageBps") as avg_slippage
          FROM "Trade"
          WHERE "timestamp" > NOW() - INTERVAL ${sqlInterval}
            AND "slippageBps" IS NOT NULL
          GROUP BY bucket
          ORDER BY bucket ASC
        `
      ),

      // (c) Distribution
      prisma.$queryRaw<{ bucket: string; count: number }[]>(
        Prisma.sql`
          SELECT
            CASE
              WHEN "slippageBps" < 1 THEN '0-1 bps'
              WHEN "slippageBps" < 2 THEN '1-2 bps'
              WHEN "slippageBps" < 4 THEN '2-4 bps'
              WHEN "slippageBps" < 6 THEN '4-6 bps'
              WHEN "slippageBps" < 8 THEN '6-8 bps'
              WHEN "slippageBps" < 10 THEN '8-10 bps'
              WHEN "slippageBps" < 15 THEN '10-15 bps'
              ELSE '15+ bps'
            END as bucket,
            COUNT(*)::int as count
          FROM "Trade"
          WHERE "timestamp" > NOW() - INTERVAL ${sqlInterval}
            AND "slippageBps" IS NOT NULL
          GROUP BY bucket
          ORDER BY MIN("slippageBps")
        `
      ),

      // (d) By pair
      prisma.$queryRaw<{ pair: string; avg_slippage: number | null }[]>(
        Prisma.sql`
          SELECT
            "pair",
            AVG("slippageBps") as avg_slippage
          FROM "Trade"
          WHERE "timestamp" > NOW() - INTERVAL ${sqlInterval}
            AND "slippageBps" IS NOT NULL
          GROUP BY "pair"
          ORDER BY avg_slippage ASC
        `
      ),

      // (e) By size
      prisma.$queryRaw<{ size_bucket: number; avg_slippage: number | null }[]>(
        Prisma.sql`
          SELECT
            CASE
              WHEN "amountInUsd" < 250 THEN 100
              WHEN "amountInUsd" < 750 THEN 500
              WHEN "amountInUsd" < 2500 THEN 1000
              WHEN "amountInUsd" < 7500 THEN 5000
              WHEN "amountInUsd" < 15000 THEN 10000
              WHEN "amountInUsd" < 37500 THEN 25000
              WHEN "amountInUsd" < 75000 THEN 50000
              ELSE 100000
            END as size_bucket,
            AVG("slippageBps") as avg_slippage
          FROM "Trade"
          WHERE "timestamp" > NOW() - INTERVAL ${sqlInterval}
            AND "slippageBps" IS NOT NULL
            AND "amountInUsd" IS NOT NULL
          GROUP BY size_bucket
          ORDER BY size_bucket ASC
        `
      ),
    ]);

  // Extract stats with fallback to 0
  const stats = statsRows[0];
  const avgSlippageBps = stats?.avg != null ? Number(stats.avg) : 0;
  const medianSlippageBps = stats?.median != null ? Number(stats.median) : 0;
  const p95SlippageBps = stats?.p95 != null ? Number(stats.p95) : 0;

  // Map time series
  const timeSeries: TimeSeries[] = timeSeriesRows.map((row) => ({
    time: new Date(row.bucket).toISOString(),
    value: row.avg_slippage != null ? Number(row.avg_slippage) : 0,
  }));

  // Map distribution
  const distribution = distributionRows.map((row) => ({
    bucket: row.bucket,
    count: Number(row.count),
  }));

  // Map by pair
  const byPair = byPairRows.map((row) => ({
    pair: row.pair,
    avgSlippage: row.avg_slippage != null ? Number(row.avg_slippage) : 0,
  }));

  // Map by size
  const bySize = bySizeRows.map((row) => ({
    size: Number(row.size_bucket),
    slippage: row.avg_slippage != null ? Number(row.avg_slippage) : 0,
  }));

  return {
    avgSlippageBps,
    medianSlippageBps,
    p95SlippageBps,
    timeSeries,
    distribution,
    byPair,
    bySize,
  };
}
