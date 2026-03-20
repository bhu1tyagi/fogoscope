/**
 * Calculate slippage in basis points (bps).
 *
 * Positive result means execution was worse than expected (adverse slippage).
 * Negative result means execution was better than expected (positive slippage).
 *
 * @param expected - The expected price or output amount.
 * @param actual   - The actual price or output amount received.
 * @returns Slippage in basis points. 1 bps = 0.01%.
 */
export function calculateSlippage(expected: number, actual: number): number {
  if (expected === 0) {
    return 0;
  }

  const slippage = ((expected - actual) / expected) * 10_000;
  return Math.round(slippage * 100) / 100;
}

/**
 * Calculate price impact as a percentage.
 *
 * Price impact = (inputUsd - outputUsd) / inputUsd * 100
 *
 * A positive value indicates the trade moved the price against the user.
 * A negative value indicates the user received more value than input (uncommon).
 *
 * @param inputUsd  - The USD value of the input tokens.
 * @param outputUsd - The USD value of the output tokens received.
 * @returns Price impact as a percentage (e.g. 0.5 = 0.5%).
 */
export function calculatePriceImpact(
  inputUsd: number,
  outputUsd: number
): number {
  if (inputUsd === 0) {
    return 0;
  }

  const impact = ((inputUsd - outputUsd) / inputUsd) * 100;
  return Math.round(impact * 10_000) / 10_000;
}
