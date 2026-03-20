import { solanaConnection } from "@/lib/blockchain/connection";
import type { ChainComparison } from "@/types/metrics";

/**
 * Fetch live chain comparison data from Fogo, Solana, Ethereum, and Hyperliquid.
 * Accepts current Fogo stats as input and returns a ChainComparison[] array.
 */
export async function fetchChainComparisons(fogoStats: {
  tps: number;
  blockTimeMs: number;
  validators: number;
}): Promise<ChainComparison[]> {
  const chains: ChainComparison[] = [];

  // Fogo (live)
  // Compute 24h txns from TPS * 86400 for consistency with other chains.
  // All chains report total TPS (including votes/oracle), so this is apples-to-apples.
  const fogoTxs24h = Math.round(fogoStats.tps * 86400);

  chains.push({
    chain: "Fogo",
    tps: Math.round(fogoStats.tps),
    blockTimeMs: Math.round(fogoStats.blockTimeMs),
    finality: "~400ms",
    validators: fogoStats.validators,
    txs24h: fogoTxs24h,
    live: true,
  });

  // Solana (live from RPC)
  try {
    const [solanaSamples, solanaVoteAccounts] = await Promise.all([
      solanaConnection.getRecentPerformanceSamples(1),
      solanaConnection.getVoteAccounts(),
    ]);

    const solanaSample = solanaSamples[0];
    const solanaTps = solanaSample
      ? Math.round(solanaSample.numTransactions / solanaSample.samplePeriodSecs)
      : 4000;
    const solanaBlockTimeMs = solanaSample && solanaSample.numSlots > 0
      ? Math.round((solanaSample.samplePeriodSecs * 1000) / solanaSample.numSlots)
      : 400;
    const solanaValidators = solanaVoteAccounts.current.length;
    // Use TPS * 86400 for consistency (total txns including votes, same as all chains)
    const solanaTxs24h = Math.round(solanaTps * 86400);

    chains.push({
      chain: "Solana",
      tps: solanaTps,
      blockTimeMs: solanaBlockTimeMs,
      finality: "~12s",
      validators: solanaValidators,
      txs24h: solanaTxs24h,
      live: true,
    });
  } catch {
    // Fallback to approximate values
    chains.push({
      chain: "Solana",
      tps: 4000,
      blockTimeMs: 400,
      finality: "~12s",
      validators: 1900,
      txs24h: 250_000_000,
    });
  }

  // Ethereum — fetch live from public RPC
  try {
    const ethBlockRes = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    });
    if (ethBlockRes.ok) {
      const ethBlockData = await ethBlockRes.json();

      // Fetch latest block to get tx count
      const ethBlock = await fetch("https://eth.llamarpc.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber",
          params: [ethBlockData.result, false],
        }),
      });
      const ethBlockInfo = await ethBlock.json();
      const txCount = ethBlockInfo.result?.transactions?.length ?? 150;
      // Ethereum: ~12s blocks, so TPS ≈ txCount / 12
      const ethTps = Math.round(txCount / 12);
      // ~7200 blocks/day * txCount = daily txns
      const ethTxs24h = Math.round(txCount * 7200);

      chains.push({
        chain: "Ethereum",
        tps: ethTps,
        blockTimeMs: 12000,
        finality: "~15min",
        validators: 1_000_000,
        txs24h: ethTxs24h,
        live: true,
      });
    } else {
      throw new Error("ETH RPC failed");
    }
  } catch {
    chains.push({
      chain: "Ethereum",
      tps: 15,
      blockTimeMs: 12000,
      finality: "~15min",
      validators: 1_000_000,
      txs24h: 1_100_000,
    });
  }

  // Hyperliquid — live from public APIs
  try {
    const [hlValidators, hlStats] = await Promise.all([
      // Validator count from info API
      fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "validatorSummaries" }),
      }).then((r) => r.ok ? r.json() : null),

      // Global stats (daily volume, users)
      fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "globalStats" }),
      }).then((r) => r.ok ? r.json() : null),
    ]);

    const validatorCount = Array.isArray(hlValidators) ? hlValidators.length : 4;
    // dailyVolume is in USD; estimate tx count from typical $50 avg trade size
    const dailyVolume = hlStats?.dailyVolume ?? 0;
    const estimatedTxs24h = dailyVolume > 0 ? Math.round(dailyVolume / 50) : 100_000_000;
    // TPS from estimated 24h txns
    const hlTps = Math.round(estimatedTxs24h / 86400);

    chains.push({
      chain: "Hyperliquid",
      tps: hlTps,
      blockTimeMs: 200, // L1 native block time (~200ms) — not available from EVM RPC
      finality: "~1s",
      validators: validatorCount,
      txs24h: estimatedTxs24h,
      live: true,
    });
  } catch {
    chains.push({
      chain: "Hyperliquid",
      tps: 200_000,
      blockTimeMs: 200,
      finality: "~1s",
      validators: 4,
      txs24h: 100_000_000,
    });
  }

  return chains;
}
