const BASE_URL = "https://api.dexscreener.com";

/** A single pair as returned by the DEX Screener API. */
export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    m5: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
}

interface SearchResponse {
  pairs: DexScreenerPair[] | null;
}

interface TokenPairsResponse {
  pairs: DexScreenerPair[] | null;
}

/**
 * Search for pairs matching a free-text query.
 * GET /latest/dex/search?q={query}
 */
export async function searchPairs(query: string): Promise<DexScreenerPair[]> {
  try {
    const url = `${BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(
        `[DexScreener] searchPairs failed: ${res.status} ${res.statusText}`
      );
      return [];
    }

    const data: SearchResponse = await res.json();
    return data.pairs ?? [];
  } catch (err) {
    console.error("[DexScreener] searchPairs error:", err);
    return [];
  }
}

/**
 * Get all pairs for a specific token on a specific chain.
 * GET /token-pairs/v1/{chainId}/{tokenAddress}
 */
export async function getTokenPairs(
  chainId: string,
  tokenAddress: string
): Promise<DexScreenerPair[]> {
  try {
    const url = `${BASE_URL}/token-pairs/v1/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(
        `[DexScreener] getTokenPairs failed: ${res.status} ${res.statusText}`
      );
      return [];
    }

    const data: TokenPairsResponse = await res.json();
    return data.pairs ?? [];
  } catch (err) {
    console.error("[DexScreener] getTokenPairs error:", err);
    return [];
  }
}

/**
 * Convenience method: search for all pairs mentioning "fogo".
 */
export async function getFogoPairs(): Promise<DexScreenerPair[]> {
  return searchPairs("fogo");
}
