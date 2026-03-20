import { NextRequest, NextResponse } from "next/server";
import type { TradeRecord } from "@/types/metrics";
import type { PaginatedResponse } from "@/types/common";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const dexFilter = searchParams.get("dex");
    const pairFilter = searchParams.get("pair");
    const walletFilter = searchParams.get("wallet");

    // Build Prisma where clause from filters
    const where: Record<string, string> = {};
    if (dexFilter) where.dex = dexFilter;
    if (pairFilter) where.pair = pairFilter;
    if (walletFilter) where.wallet = walletFilter;

    const skip = (page - 1) * limit;

    // Run query and count in parallel
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.trade.count({ where }),
    ]);

    // Map DB model to TradeRecord
    const data: TradeRecord[] = trades.map((trade) => {
      const baseToken = trade.pair.split("/")[0];
      const side: "buy" | "sell" = trade.tokenOut === baseToken ? "buy" : "sell";

      return {
        id: trade.id,
        signature: trade.signature,
        timestamp: trade.timestamp.toISOString(),
        dex: trade.dex,
        pair: trade.pair,
        side,
        amountIn: trade.amountIn.toNumber(),
        amountOut: trade.amountOut.toNumber(),
        amountInUsd: trade.amountInUsd?.toNumber() ?? 0,
        amountOutUsd: trade.amountOutUsd?.toNumber() ?? 0,
        expectedOut: trade.expectedOut?.toNumber() ?? null,
        slippageBps: trade.slippageBps?.toNumber() ?? null,
        priceImpact: trade.priceImpact?.toNumber() ?? null,
        executionTimeMs: trade.executionTimeMs ?? null,
        executionQuality: trade.executionQuality ?? null,
        wallet: trade.wallet,
        isSession: trade.isSession,
      };
    });

    const response: PaginatedResponse<TradeRecord> = {
      data,
      total,
      page,
      pageSize: limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch trades:", error);
    return NextResponse.json(
      { message: "Failed to fetch trades", code: "INTERNAL_ERROR", status: 500 },
      { status: 500 },
    );
  }
}
