/**
 * MEV detection types and heuristic detectors for on-chain trades.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type MEVType =
  | "sandwich"
  | "frontrun"
  | "arbitrage"
  | "oracle_deviation"
  | "none_detected";

export type Severity = "none" | "low" | "medium" | "high";

/** A single trade within a block, used as input to MEV detectors. */
export interface TradeInBlock {
  /** Transaction signature / hash. */
  txHash: string;
  /** Position of this transaction within the block. */
  txIndex: number;
  /** Wallet address of the trader. */
  wallet: string;
  /** Pair address (pool / AMM). */
  pairAddress: string;
  /** "buy" or "sell" relative to the base token. */
  side: "buy" | "sell";
  /** Size of the trade in USD. */
  amountUsd: number;
  /** Execution price. */
  price: number;
  /** Unix timestamp (seconds). */
  timestamp: number;
  /** Block number / slot. */
  blockNumber: number;
}

/** Result produced by a detector for a single MEV event. */
export interface MEVDetectionResult {
  type: MEVType;
  severity: Severity;
  /** The victim transaction (if applicable). */
  targetTx: string;
  /** The victim's wallet address (if applicable). */
  victimWallet: string | null;
  /** Attacker / beneficiary transactions. */
  attackerTxs: string[];
  /** Estimated profit extracted in USD (0 if unknown). */
  estimatedProfitUsd: number;
  /** Human-readable explanation. */
  description: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifySeverity(profitUsd: number): Severity {
  if (profitUsd <= 0) return "none";
  if (profitUsd < 10) return "low";
  if (profitUsd < 100) return "medium";
  return "high";
}

/**
 * Group trades by pair address for easier analysis.
 */
function groupByPair(
  trades: TradeInBlock[]
): Map<string, TradeInBlock[]> {
  const map = new Map<string, TradeInBlock[]>();
  for (const t of trades) {
    const existing = map.get(t.pairAddress);
    if (existing) {
      existing.push(t);
    } else {
      map.set(t.pairAddress, [t]);
    }
  }
  return map;
}

// ── Sandwich Detection ───────────────────────────────────────────────────────

/**
 * Detect sandwich attacks within a set of trades from the same block.
 *
 * A sandwich attack occurs when:
 *   1. Attacker places a trade BEFORE the victim (frontrun) on the same pair.
 *   2. Victim's trade executes in between.
 *   3. Attacker places the opposite trade AFTER the victim (backrun).
 *   4. Attacker wallet is the same for both front and back trades.
 *   5. Attacker wallet differs from the victim wallet.
 */
export function detectSandwich(
  trades: TradeInBlock[]
): MEVDetectionResult[] {
  const results: MEVDetectionResult[] = [];

  if (trades.length < 3) return results;

  const pairGroups = groupByPair(trades);

  for (const [pairAddress, pairTrades] of pairGroups) {
    // Need at least 3 trades on the same pair to form a sandwich
    if (pairTrades.length < 3) continue;

    // Sort by position in block
    const sorted = [...pairTrades].sort((a, b) => a.txIndex - b.txIndex);

    // Sliding window: check every consecutive triple
    for (let i = 0; i <= sorted.length - 3; i++) {
      const front = sorted[i];
      const victim = sorted[i + 1];
      const back = sorted[i + 2];

      // Same attacker wallet for front and back, different from victim
      if (front.wallet !== back.wallet) continue;
      if (front.wallet === victim.wallet) continue;

      // Front and back should be opposite sides
      if (front.side === back.side) continue;

      // Front side should match victim's side (attacker buys before victim buys)
      if (front.side !== victim.side) continue;

      // Estimate profit: price difference * victim amount
      const priceDelta = Math.abs(back.price - front.price);
      const estimatedProfitUsd =
        priceDelta > 0 ? (priceDelta / front.price) * front.amountUsd : 0;

      results.push({
        type: "sandwich",
        severity: classifySeverity(estimatedProfitUsd),
        targetTx: victim.txHash,
        victimWallet: victim.wallet,
        attackerTxs: [front.txHash, back.txHash],
        estimatedProfitUsd: Math.round(estimatedProfitUsd * 100) / 100,
        description:
          `Sandwich attack on pair ${pairAddress}: ` +
          `${front.wallet.slice(0, 8)}... bracketed ` +
          `${victim.wallet.slice(0, 8)}...'s ${victim.side} ` +
          `($${victim.amountUsd.toFixed(2)}) ` +
          `with a ${front.side} and ${back.side}. ` +
          `Est. profit: $${estimatedProfitUsd.toFixed(2)}.`,
      });
    }
  }

  return results;
}

// ── Frontrun Detection ───────────────────────────────────────────────────────

/**
 * Detect frontrunning: a trade placed immediately before a larger trade
 * on the same pair and same side, by a different wallet.
 *
 * Heuristic:
 *   - Two consecutive same-pair, same-side trades from different wallets.
 *   - The first trade is smaller than the second (front-runs the larger order).
 *   - The frontrunner's trade is positioned immediately before the target.
 */
export function detectFrontrun(
  trades: TradeInBlock[]
): MEVDetectionResult[] {
  const results: MEVDetectionResult[] = [];

  if (trades.length < 2) return results;

  const pairGroups = groupByPair(trades);

  for (const [pairAddress, pairTrades] of pairGroups) {
    if (pairTrades.length < 2) continue;

    const sorted = [...pairTrades].sort((a, b) => a.txIndex - b.txIndex);

    for (let i = 0; i < sorted.length - 1; i++) {
      const suspect = sorted[i];
      const target = sorted[i + 1];

      // Different wallets
      if (suspect.wallet === target.wallet) continue;

      // Same side (both buys or both sells)
      if (suspect.side !== target.side) continue;

      // Suspect trade is smaller than the target (front-running a big order)
      if (suspect.amountUsd >= target.amountUsd) continue;

      // Target should be at least 2x the suspect's size for meaningful frontrun
      if (target.amountUsd < suspect.amountUsd * 2) continue;

      // Estimate the price advantage the frontrunner obtained
      const priceSlippage = Math.abs(target.price - suspect.price);
      const estimatedProfitUsd =
        priceSlippage > 0
          ? (priceSlippage / suspect.price) * suspect.amountUsd
          : 0;

      results.push({
        type: "frontrun",
        severity: classifySeverity(estimatedProfitUsd),
        targetTx: target.txHash,
        victimWallet: target.wallet,
        attackerTxs: [suspect.txHash],
        estimatedProfitUsd: Math.round(estimatedProfitUsd * 100) / 100,
        description:
          `Possible frontrun on pair ${pairAddress}: ` +
          `${suspect.wallet.slice(0, 8)}... placed a $${suspect.amountUsd.toFixed(2)} ${suspect.side} ` +
          `immediately before ${target.wallet.slice(0, 8)}...'s $${target.amountUsd.toFixed(2)} ${target.side}. ` +
          `Est. profit: $${estimatedProfitUsd.toFixed(2)}.`,
      });
    }
  }

  return results;
}

// ── Arbitrage Detection ─────────────────────────────────────────────────────

/**
 * Detect potential arbitrage: a single wallet executing opposite-side trades
 * on different pairs within the same block (cross-pair arb).
 *
 * Heuristic:
 *   - Same wallet, same block, different pairs.
 *   - Buy on one pair and sell on another (round-trip).
 *   - Net positive USD outcome suggests profit extraction.
 */
export function detectArbitrage(
  trades: TradeInBlock[]
): MEVDetectionResult[] {
  const results: MEVDetectionResult[] = [];

  if (trades.length < 2) return results;

  // Group trades by wallet
  const walletGroups = new Map<string, TradeInBlock[]>();
  for (const t of trades) {
    const group = walletGroups.get(t.wallet) ?? [];
    group.push(t);
    walletGroups.set(t.wallet, group);
  }

  for (const [wallet, walletTrades] of walletGroups) {
    // Need at least 2 trades from the same wallet
    if (walletTrades.length < 2) continue;

    // Check if the wallet traded on multiple pairs with opposite sides
    const pairs = new Set(walletTrades.map((t) => t.pairAddress));
    if (pairs.size < 2) continue;

    const buys = walletTrades.filter((t) => t.side === "buy");
    const sells = walletTrades.filter((t) => t.side === "sell");

    // Must have both buys and sells across different pairs
    if (buys.length === 0 || sells.length === 0) continue;

    const buyPairs = new Set(buys.map((t) => t.pairAddress));
    const sellPairs = new Set(sells.map((t) => t.pairAddress));

    // The buys and sells should be on different pairs (cross-pair arb)
    const crossPair = [...buyPairs].some((p) => !sellPairs.has(p)) ||
                      [...sellPairs].some((p) => !buyPairs.has(p));
    if (!crossPair) continue;

    const totalBuyUsd = buys.reduce((s, t) => s + t.amountUsd, 0);
    const totalSellUsd = sells.reduce((s, t) => s + t.amountUsd, 0);
    const estimatedProfitUsd = Math.abs(totalSellUsd - totalBuyUsd);

    // Only flag if there's meaningful profit (>$1)
    if (estimatedProfitUsd < 1) continue;

    const allTxs = walletTrades.map((t) => t.txHash);

    results.push({
      type: "arbitrage",
      severity: classifySeverity(estimatedProfitUsd),
      targetTx: allTxs[0],
      victimWallet: null, // Arbitrage has no victim
      attackerTxs: allTxs.slice(1),
      estimatedProfitUsd: Math.round(estimatedProfitUsd * 100) / 100,
      description:
        `Cross-pair arbitrage by ${wallet.slice(0, 8)}...: ` +
        `bought on ${[...buyPairs].join(", ")} and sold on ${[...sellPairs].join(", ")}. ` +
        `${walletTrades.length} trades totaling $${(totalBuyUsd + totalSellUsd).toFixed(2)}. ` +
        `Est. profit: $${estimatedProfitUsd.toFixed(2)}.`,
    });
  }

  return results;
}

// ── MEV Score ────────────────────────────────────────────────────────────────

/**
 * Calculate an aggregate MEV score for a set of detected events.
 *
 * Returns a value from 0 to 100 where:
 *   0   = no MEV detected at all
 *   100 = every trade was affected by high-severity MEV
 *
 * The score factors in both the proportion of affected trades and
 * the severity of detected events.
 */
export function calculateMEVScore(
  events: MEVDetectionResult[],
  totalTrades: number
): number {
  if (totalTrades <= 0 || events.length === 0) return 0;

  const severityWeights: Record<Severity, number> = {
    none: 0,
    low: 0.25,
    medium: 0.5,
    high: 1.0,
  };

  // Sum the severity-weighted impact of all events
  let weightedSum = 0;
  for (const event of events) {
    weightedSum += severityWeights[event.severity];
  }

  // Normalize: ratio of weighted events to total trades, capped at 1
  const ratio = Math.min(weightedSum / totalTrades, 1);

  // Scale to 0-100
  return Math.round(ratio * 100 * 100) / 100;
}
