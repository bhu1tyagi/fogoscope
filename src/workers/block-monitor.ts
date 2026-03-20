import { BaseWorker } from "./base-worker";
import { fogoConnection } from "../lib/blockchain/connection";
import { prisma } from "../lib/db/prisma";
import { setCache, CacheTier } from "../lib/redis/cache";

/**
 * Polls the Fogo RPC every second for the latest slot, TPS, and block time,
 * then persists a BlockMetric row and updates the real-time Redis cache.
 */
export class BlockMonitor extends BaseWorker {
  name = "BlockMonitor";
  intervalMs = 1000;

  private lastSlotTime: number | null = null;
  private lastSlot: number | null = null;

  async execute(): Promise<void> {
    // 1. Current slot
    const slot = await fogoConnection.getSlot();

    // 2. TPS from recent performance samples
    const samples = await fogoConnection.getRecentPerformanceSamples(1);
    let tps = 0;
    if (samples.length > 0) {
      const sample = samples[0];
      tps =
        sample.samplePeriodSecs > 0
          ? Math.round(sample.numTransactions / sample.samplePeriodSecs)
          : 0;
    }

    // 3. Block time (seconds since Unix epoch, or null)
    let blockTime: number | null = null;
    try {
      blockTime = await fogoConnection.getBlockTime(slot);
    } catch {
      // Block time may not be available for the very latest slot
    }

    // 4. Compute blockTimeMs
    // Primary: consecutive slot timestamps. But getBlockTime() has 1-second granularity,
    // so for fast chains (<1s blocks) this often yields 0. Fall back to performance samples.
    let blockTimeMs = 0;
    if (blockTime !== null && this.lastSlotTime !== null && this.lastSlot !== null) {
      const slotDiff = slot - this.lastSlot;
      if (slotDiff > 0) {
        blockTimeMs = Math.round(((blockTime - this.lastSlotTime) * 1000) / slotDiff);
      }
    }
    // Fallback: derive from performance samples (more accurate for fast chains)
    if (blockTimeMs <= 0 && samples.length > 0) {
      const s = samples[0];
      if (s.numSlots > 0 && s.samplePeriodSecs > 0) {
        blockTimeMs = Math.round((s.samplePeriodSecs * 1000) / s.numSlots);
      }
    }
    // Update tracking for next iteration
    if (blockTime !== null) {
      this.lastSlotTime = blockTime;
      this.lastSlot = slot;
    }

    // 5. Fetch block to count successful/failed transactions
    let totalTxns = 0;
    let failedTxns = 0;
    try {
      const block = await fogoConnection.getBlock(slot, {
        transactionDetails: "full",
        maxSupportedTransactionVersion: 0,
        rewards: false,
      });
      if (block?.transactions) {
        totalTxns = block.transactions.length;
        failedTxns = block.transactions.filter(
          (tx) => tx.meta?.err !== null
        ).length;
      }
    } catch {
      // Block may not be available yet — use sample data
    }

    const successRate = totalTxns > 0 ? (totalTxns - failedTxns) / totalTxns : 1.0;

    console.log(
      `[${this.name}] slot=${slot} tps=${tps} blockTimeMs=${blockTimeMs} txns=${totalTxns} failed=${failedTxns}`
    );

    // 6. Persist to DB (best-effort)
    try {
      await prisma.blockMetric.create({
        data: {
          slot: BigInt(slot),
          timestamp: blockTime ? new Date(blockTime * 1000) : new Date(),
          tps,
          blockTimeMs,
          totalTxns,
          failedTxns,
          successRate,
        },
      });
    } catch (err) {
      console.error(`[${this.name}] DB write failed:`, err);
    }

    // 7. Update real-time Redis cache (best-effort)
    try {
      await setCache(
        "rt:block:latest",
        {
          slot,
          tps,
          blockTime,
          blockTimeMs,
          updatedAt: Date.now(),
        },
        CacheTier.REALTIME
      );
    } catch (err) {
      console.error(`[${this.name}] Redis cache update failed:`, err);
    }
  }
}
