import { prisma } from "../lib/db/prisma";
import { MINT_SYMBOLS } from "../lib/blockchain/program-ids";

const REVERSE_SYMBOLS: Record<string, string> = {};
for (const [mint, sym] of Object.entries(MINT_SYMBOLS)) {
  REVERSE_SYMBOLS[sym] = mint;
}

/**
 * One-time backfill: compute slippage for trades that have NULL slippageBps
 * but have both amountInUsd and amountOutUsd available, or where we can look
 * up prices from the TokenPrice table.
 *
 * Runs once on worker startup after PriceCollector has had time to populate
 * quote-token prices (like USDC.s).
 */
export async function backfillSlippage(): Promise<void> {
  console.log("[BackfillSlippage] Starting...");

  // Step 1: Clamp any existing negative slippage/priceImpact values to 0.
  // These were written before the clamping fix was added.
  try {
    const clamped = await prisma.$executeRaw`
      UPDATE "Trade"
      SET "slippageBps" = 0, "priceImpact" = 0
      WHERE "slippageBps" < 0 OR "priceImpact" < 0
    `;
    console.log(`[BackfillSlippage] Clamped ${clamped} trades with negative slippage to 0`);
  } catch (err) {
    console.error("[BackfillSlippage] Failed to clamp negatives:", err);
  }

  // Step 2: Compute slippage for trades that still have NULL slippageBps.
  const priceMap = new Map<string, number>();
  for (const symbol of Object.values(MINT_SYMBOLS)) {
    try {
      const row = await prisma.tokenPrice.findFirst({
        where: { chain: "fogo", symbol },
        orderBy: { timestamp: "desc" },
        select: { priceUsd: true },
      });
      if (row) {
        priceMap.set(symbol.toLowerCase(), row.priceUsd.toNumber());
      }
    } catch {
      // skip
    }
  }

  console.log(
    `[BackfillSlippage] Price map loaded: ${priceMap.size} tokens (${[...priceMap.keys()].join(", ")})`
  );

  if (priceMap.size < 2) {
    console.log("[BackfillSlippage] Not enough prices yet, skipping NULL backfill");
    return;
  }

  const trades = await prisma.trade.findMany({
    where: { slippageBps: null },
    select: {
      id: true,
      timestamp: true,
      tokenIn: true,
      tokenOut: true,
      amountIn: true,
      amountOut: true,
      amountInUsd: true,
      amountOutUsd: true,
    },
    orderBy: { timestamp: "desc" },
  });

  console.log(`[BackfillSlippage] Found ${trades.length} trades with NULL slippage`);

  let updated = 0;

  for (const trade of trades) {
    const inSymbol = (MINT_SYMBOLS[trade.tokenIn] ?? "").toLowerCase();
    const outSymbol = (MINT_SYMBOLS[trade.tokenOut] ?? "").toLowerCase();

    let amountInUsd = trade.amountInUsd?.toNumber() ?? null;
    let amountOutUsd = trade.amountOutUsd?.toNumber() ?? null;

    if (amountInUsd === null && inSymbol) {
      const price = priceMap.get(inSymbol);
      if (price) amountInUsd = trade.amountIn.toNumber() * price;
    }
    if (amountOutUsd === null && outSymbol) {
      const price = priceMap.get(outSymbol);
      if (price) amountOutUsd = trade.amountOut.toNumber() * price;
    }

    if (
      amountInUsd === null || amountInUsd <= 0.1 ||
      amountOutUsd === null || amountOutUsd <= 0.1
    ) {
      continue;
    }

    const rawImpact = ((amountInUsd - amountOutUsd) / amountInUsd) * 100;
    const rawSlippage = rawImpact * 100;

    if (rawSlippage > 200) continue;

    const slippageBps = Math.round(Math.max(0, rawSlippage) * 100) / 100;
    const priceImpact = Math.round(Math.max(0, rawImpact) * 10000) / 10000;

    try {
      await prisma.$executeRaw`
        UPDATE "Trade"
        SET "slippageBps" = ${slippageBps},
            "priceImpact" = ${priceImpact},
            "amountInUsd" = COALESCE("amountInUsd", ${amountInUsd}),
            "amountOutUsd" = COALESCE("amountOutUsd", ${amountOutUsd})
        WHERE id = ${trade.id} AND timestamp = ${trade.timestamp}
      `;
      updated++;
    } catch (err) {
      console.error(`[BackfillSlippage] Failed to update trade ${trade.id}:`, err);
    }
  }

  console.log(
    `[BackfillSlippage] Done. Updated ${updated}/${trades.length} trades with slippage data.`
  );
}
