import { BaseWorker } from "./base-worker";
import { prisma } from "../lib/db/prisma";
import {
  detectSandwich,
  detectFrontrun,
  detectArbitrage,
  type TradeInBlock,
  type MEVDetectionResult,
} from "../lib/analytics/mev";

/**
 * Scans recent trades grouped by slot (block) for MEV patterns
 * (sandwich attacks, frontrunning) and writes detected events to MEVEvent.
 *
 * Runs every 10 seconds. On each cycle:
 * 1. Fetch trades from the last 2 minutes grouped by slot
 * 2. For each slot with 2+ trades, run sandwich and frontrun detectors
 * 3. Write new MEVDetectionResults to MEVEvent table (skip duplicates)
 */
export class MEVDetector extends BaseWorker {
  name = "MEVDetector";
  intervalMs = 10_000;

  /** Track the latest slot we've fully scanned to avoid re-processing */
  private lastScannedSlot: bigint = BigInt(0);

  async execute(): Promise<void> {
    // 1. Fetch recent trades grouped by slot — only slots with 2+ trades are interesting
    const recentTrades = await prisma.trade.findMany({
      where: {
        slot: { gt: this.lastScannedSlot },
      },
      orderBy: { slot: "asc" },
      // Limit to prevent huge queries on first run
      take: 5000,
    });

    if (recentTrades.length === 0) return;

    // 2. Group trades by slot
    const slotGroups = new Map<bigint, typeof recentTrades>();
    for (const trade of recentTrades) {
      const group = slotGroups.get(trade.slot) ?? [];
      group.push(trade);
      slotGroups.set(trade.slot, group);
    }

    // Update bookmark to highest slot we've seen
    const maxSlot = recentTrades[recentTrades.length - 1].slot;
    this.lastScannedSlot = maxSlot;

    let totalDetected = 0;
    let slotsScanned = 0;

    // 3. For each slot with 2+ trades, run detectors
    for (const [slot, trades] of slotGroups) {
      if (trades.length < 2) continue;
      slotsScanned++;

      // Map DB Trade to TradeInBlock format required by detectors
      const tradesInBlock: TradeInBlock[] = trades.map((t, idx) => {
        const [base] = t.pair.split("/");
        // Determine side: if tokenOut matches base token symbol, it's a "buy"
        const inSymbol = t.tokenIn.slice(0, 8);
        const outSymbol = t.tokenOut.slice(0, 8);
        const side: "buy" | "sell" = outSymbol === base || t.tokenOut.includes(base)
          ? "buy"
          : "sell";

        return {
          txHash: t.signature,
          txIndex: idx, // approximate ordering within block
          wallet: t.wallet,
          pairAddress: t.pair, // use pair name as grouping key
          side,
          amountUsd: t.amountInUsd ? Number(t.amountInUsd) : 0,
          price: t.amountOut && Number(t.amountIn) > 0
            ? Number(t.amountOut) / Number(t.amountIn)
            : 0,
          timestamp: Math.floor(t.timestamp.getTime() / 1000),
          blockNumber: Number(slot),
        };
      });

      // Run all three detectors
      const sandwiches = detectSandwich(tradesInBlock);
      const frontruns = detectFrontrun(tradesInBlock);
      const arbitrages = detectArbitrage(tradesInBlock);
      const allEvents: MEVDetectionResult[] = [...sandwiches, ...frontruns, ...arbitrages];

      if (allEvents.length === 0) continue;

      // 4. Write detected events to MEVEvent table
      for (const event of allEvents) {
        try {
          // Use the target tx + type as a dedup key
          const existingCount = await prisma.mEVEvent.count({
            where: {
              relatedTxs: { has: event.targetTx },
              eventType: event.type,
            },
          });
          if (existingCount > 0) continue;

          await prisma.mEVEvent.create({
            data: {
              slot,
              timestamp: new Date(),
              eventType: event.type,
              severity: event.severity,
              relatedTxs: [event.targetTx, ...event.attackerTxs],
              estimatedProfit: event.estimatedProfitUsd > 0
                ? event.estimatedProfitUsd
                : null,
              victimWallet: event.victimWallet ?? null,
              description: event.description,
            },
          });
          totalDetected++;
        } catch (err) {
          console.error(`[${this.name}] Failed to write MEV event:`, err);
        }
      }
    }

    if (slotsScanned > 0 || totalDetected > 0) {
      console.log(
        `[${this.name}] Scanned ${slotsScanned} multi-trade slots, detected ${totalDetected} MEV events`
      );
    }
  }
}
