/**
 * Execution quality scoring system.
 *
 * Produces a composite score from 0 to 100 where:
 *   100 = perfect execution (zero slippage, no MEV, instant, 100% success, free)
 *     0 = worst possible execution
 *
 * Weights:
 *   Slippage:    30%
 *   MEV:         25%
 *   Latency:     20%
 *   Reliability: 15%
 *   Cost:        10%
 */

export interface ExecutionMetrics {
  /** Average slippage in basis points (0 = perfect, higher = worse). */
  avgSlippageBps: number;
  /** Average number of MEV events per transaction (0 = no MEV). */
  mevEventsPerTx: number;
  /** Average trade latency in milliseconds. */
  avgLatencyMs: number;
  /** Trade failure rate as a fraction (0 = all succeed, 1 = all fail). */
  tradeFailureRate: number;
  /** Average priority fee in lamports or micro-units. */
  avgPriorityFee: number;
}

// Component weight constants
const WEIGHT_SLIPPAGE = 0.3;
const WEIGHT_MEV = 0.25;
const WEIGHT_LATENCY = 0.2;
const WEIGHT_RELIABILITY = 0.15;
const WEIGHT_COST = 0.1;

/**
 * Score a single metric on a 0-100 scale using exponential decay.
 *
 * @param value     - The raw metric value (lower is better).
 * @param halfLife  - The value at which the score drops to 50.
 */
function decayScore(value: number, halfLife: number): number {
  if (value <= 0) return 100;
  // Exponential decay: score = 100 * 2^(-value / halfLife)
  const score = 100 * Math.pow(2, -value / halfLife);
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate a composite execution quality score from 0 to 100.
 */
export function calculateExecutionScore(metrics: ExecutionMetrics): number {
  // Slippage score: 50 bps half-life (50 bps -> score of 50)
  const slippageScore = decayScore(Math.abs(metrics.avgSlippageBps), 50);

  // MEV score: 0.5 events/tx half-life
  const mevScore = decayScore(metrics.mevEventsPerTx, 0.5);

  // Latency score: 2000ms half-life
  const latencyScore = decayScore(metrics.avgLatencyMs, 2000);

  // Reliability: directly invert the failure rate
  // 0% failure = 100, 100% failure = 0
  const reliabilityScore = Math.max(
    0,
    Math.min(100, (1 - metrics.tradeFailureRate) * 100)
  );

  // Cost score: 100_000 micro-units half-life (generous for low-fee chains)
  const costScore = decayScore(metrics.avgPriorityFee, 100_000);

  const composite =
    slippageScore * WEIGHT_SLIPPAGE +
    mevScore * WEIGHT_MEV +
    latencyScore * WEIGHT_LATENCY +
    reliabilityScore * WEIGHT_RELIABILITY +
    costScore * WEIGHT_COST;

  return Math.round(composite * 100) / 100;
}
