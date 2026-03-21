import { BaseWorker } from "./base-worker";
import { prisma } from "../lib/db/prisma";
import { MINT_SYMBOLS } from "../lib/blockchain/program-ids";
import {
  detectSandwich,
  detectFrontrun,
  detectArbitrage,
  type TradeInBlock,
  type MEVDetectionResult,
} from "../lib/analytics/mev";

const REVERSE_MINT_SYMBOLS: Record<string, string> = {};
for (const [address, symbol] of Object.entries(MINT_SYMBOLS)) {
  REVERSE_MINT_SYMBOLS[symbol] = address;
}

const MIN_TRADE_USD = 5;
const MIN_PROFIT_USD = 0.5;

/**
 * Scans recent trades grouped by slot (block) for MEV patterns
 * (sandwich attacks, frontrunning) and writes detected events to MEVEvent.
 *
 * Runs every 10 seconds. On each cycle:
 * 1. Fetch trades from the last 2 minutes grouped by slot
 * 2. For each slot with 2+ usable trades, run sandwich and frontrun detectors
 * 3. Write new MEVDetectionResults to MEVEvent table (skip duplicates)
 */
export class MEVDetector extends BaseWorker {
  name = "MEVDetector";
  intervalMs = 10_000;

  private lastScannedSlot: bigint = BigInt(0);
  private hasRunCleanup = false;

  async execute(): Promise<void> {
    if (!this.hasRunCleanup) {
      await this.cleanupLegacyFalsePositives();
      this.hasRunCleanup = true;
    }
    const recentTrades = await prisma.trade.findMany({
      where: {
        slot: { gt: this.lastScannedSlot },
      },
      orderBy: [{ slot: "asc" }, { timestamp: "asc" }],
      take: 5000,
    });

    if (recentTrades.length === 0) return;

    const slotGroups = new Map<bigint, typeof recentTrades>();
    for (const trade of recentTrades) {
      const group = slotGroups.get(trade.slot) ?? [];
      group.push(trade);
      slotGroups.set(trade.slot, group);
    }

    const maxSlot = recentTrades[recentTrades.length - 1].slot;
    this.lastScannedSlot = maxSlot;

    let totalDetected = 0;
    let slotsScanned = 0;

    for (const [slot, trades] of slotGroups) {
      if (trades.length < 2) continue;
      slotsScanned++;

      const tradesInBlock: TradeInBlock[] = [];
      const sorted = [...trades].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      for (let idx = 0; idx < sorted.length; idx++) {
        const t = sorted[idx];

        const amountUsd = t.amountInUsd ? Number(t.amountInUsd) : null;
        if (amountUsd === null || amountUsd < MIN_TRADE_USD) continue;

        const side = determineSide(t.pair, t.tokenIn, t.tokenOut);
        if (!side) continue;

        const pricePerUnit =
          amountUsd > 0 && Number(t.amountIn) > 0
            ? amountUsd / Number(t.amountIn)
            : 0;

        tradesInBlock.push({
          txHash: t.signature,
          txIndex: idx,
          wallet: t.wallet,
          pairAddress: t.pair,
          side,
          amountUsd,
          price: pricePerUnit,
          timestamp: Math.floor(t.timestamp.getTime() / 1000),
          blockNumber: Number(slot),
        });
      }

      if (tradesInBlock.length < 2) continue;

      const sandwiches = detectSandwich(tradesInBlock);
      const frontruns = detectFrontrun(tradesInBlock);
      const arbitrages = detectArbitrage(tradesInBlock);
      const allEvents = [...sandwiches, ...frontruns, ...arbitrages].filter(
        (e) => e.estimatedProfitUsd >= MIN_PROFIT_USD && e.severity !== "none"
      );

      if (allEvents.length === 0) continue;

      for (const event of allEvents) {
        try {
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
              estimatedProfit: event.estimatedProfitUsd,
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

  /**
   * One-time startup: mark false-positive MEV events from the old broken
   * detection logic as deprecated. Data is preserved but excluded from queries.
   */
  private async cleanupLegacyFalsePositives(): Promise<void> {
    try {
      const result = await prisma.mEVEvent.updateMany({
        where: {
          severity: { notIn: ["deprecated"] },
          OR: [
            { estimatedProfit: null },
            { estimatedProfit: { lte: 0.5 } },
            { severity: "none" },
          ],
        },
        data: {
          severity: "deprecated",
          metadata: { legacy: true, reason: "false_positive_pre_v2_detection" },
        },
      });
      if (result.count > 0) {
        console.log(
          `[${this.name}] Marked ${result.count} legacy false-positive MEV events as deprecated`
        );
      }
    } catch (err) {
      console.error(`[${this.name}] Legacy cleanup failed:`, err);
    }
  }
}

/**
 * Determine trade side using MINT_SYMBOLS to resolve mint addresses
 * to human-readable symbols, then compare against the pair's base token.
 *
 * Returns null if either token can't be resolved (trade is unusable for MEV analysis).
 */
function determineSide(
  pair: string,
  tokenIn: string,
  tokenOut: string
): "buy" | "sell" | null {
  const [baseSymbol] = pair.split("/");
  const inSymbol = MINT_SYMBOLS[tokenIn];
  const outSymbol = MINT_SYMBOLS[tokenOut];

  if (!inSymbol && !outSymbol) return null;

  if (outSymbol === baseSymbol) return "buy";
  if (inSymbol === baseSymbol) return "sell";

  return null;
}
