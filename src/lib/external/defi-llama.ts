const BASE_URL = "https://api.llama.fi";

/** TVL data point returned by DeFi Llama historical endpoints. */
interface TVLDataPoint {
  date: number;
  totalLiquidityUSD: number;
}

/** Protocol summary as returned by DeFi Llama. */
interface LlamaProtocol {
  id: string;
  name: string;
  chain: string;
  chains: string[];
  tvl: number;
  chainTvls: Record<string, number>;
  category: string;
  slug: string;
}

/**
 * Get the current total TVL for the Fogo chain.
 * Returns 0 on failure.
 */
export async function getFogoTVL(): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/v2/chains`);
    if (!res.ok) {
      console.error(
        `[DefiLlama] getFogoTVL failed: ${res.status} ${res.statusText}`
      );
      return 0;
    }

    const chains: { name: string; tvl: number; gecko_id: string }[] =
      await res.json();
    const fogo = chains.find(
      (c) => c.name.toLowerCase() === "fogo" || c.gecko_id === "fogo"
    );
    return fogo?.tvl ?? 0;
  } catch (err) {
    console.error("[DefiLlama] getFogoTVL error:", err);
    return 0;
  }
}

/**
 * Get historical TVL data for the Fogo chain.
 * Returns an array of { date, tvl } objects sorted chronologically.
 * Returns an empty array on failure.
 */
export async function getFogoTVLHistory(): Promise<
  { date: number; tvl: number }[]
> {
  try {
    const res = await fetch(`${BASE_URL}/v2/historicalChainTvl/Fogo`);
    if (!res.ok) {
      console.error(
        `[DefiLlama] getFogoTVLHistory failed: ${res.status} ${res.statusText}`
      );
      return [];
    }

    const data: TVLDataPoint[] = await res.json();
    return data.map((d) => ({
      date: d.date,
      tvl: d.totalLiquidityUSD,
    }));
  } catch (err) {
    console.error("[DefiLlama] getFogoTVLHistory error:", err);
    return [];
  }
}

/**
 * Get all DeFi protocols that are deployed on Fogo.
 * Returns an array of { name, tvl } objects sorted by TVL descending.
 * Returns an empty array on failure.
 */
export async function getFogoProtocols(): Promise<
  { name: string; tvl: number }[]
> {
  try {
    const res = await fetch(`${BASE_URL}/protocols`);
    if (!res.ok) {
      console.error(
        `[DefiLlama] getFogoProtocols failed: ${res.status} ${res.statusText}`
      );
      return [];
    }

    const protocols: LlamaProtocol[] = await res.json();

    const fogoProtocols = protocols
      .filter((p) =>
        p.chains.some((chain) => chain.toLowerCase() === "fogo")
      )
      .map((p) => ({
        name: p.name,
        tvl: p.chainTvls["Fogo"] ?? p.tvl,
      }))
      .sort((a, b) => b.tvl - a.tvl);

    return fogoProtocols;
  } catch (err) {
    console.error("[DefiLlama] getFogoProtocols error:", err);
    return [];
  }
}
