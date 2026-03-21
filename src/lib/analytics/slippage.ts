/**
 * Calculate slippage in basis points (bps).
 *
 * Result is clamped to >= 0. Apparent "negative slippage" from cached-price
 * estimation noise is indistinguishable from true price improvement, so we
 * report it as 0 (perfect execution).
 *
 * @param expected - The expected price or output amount.
 * @param actual   - The actual price or output amount received.
 * @returns Slippage in basis points (>= 0). 1 bps = 0.01%.
 */
export function calculateSlippage(expected: number, actual: number): number {
  if (expected === 0) {
    return 0;
  }

  const slippage = ((expected - actual) / expected) * 10_000;
  return Math.max(0, Math.round(slippage * 100) / 100);
}

/**
 * Calculate price impact as a percentage.
 *
 * Clamped to >= 0 for the same reason as slippage — cached-price noise
 * can produce small negative values that aren't meaningful.
 *
 * @param inputUsd  - The USD value of the input tokens.
 * @param outputUsd - The USD value of the output tokens received.
 * @returns Price impact as a percentage (>= 0, e.g. 0.5 = 0.5%).
 */
export function calculatePriceImpact(
  inputUsd: number,
  outputUsd: number
): number {
  if (inputUsd === 0) {
    return 0;
  }

  const impact = ((inputUsd - outputUsd) / inputUsd) * 100;
  return Math.max(0, Math.round(impact * 10_000) / 10_000);
}
