/**
 * Zerion API client.
 *
 * Provides wallet portfolio, transaction history, and token price data
 * across 38+ chains (including Solana). Used as a cross-chain data source
 * alongside DEX Screener (which handles Fogo-native data).
 *
 * Auth: HTTP Basic — base64(apiKey + ":")
 * Base URL: https://api.zerion.io/v1
 * Rate limit: 120 req/min (dev tier)
 * Docs: https://developers.zerion.io/reference
 */

const ZERION_BASE = "https://api.zerion.io/v1";

function getAuthHeader(): string {
  const apiKey = process.env.ZERION_API_KEY || "";
  return `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;
}

async function zerionFetch<T>(path: string): Promise<T | null> {
  const apiKey = process.env.ZERION_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${ZERION_BASE}${path}`, {
      headers: {
        Authorization: getAuthHeader(),
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[Zerion] ${res.status} on ${path}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn("[Zerion] request failed:", err);
    return null;
  }
}

// ---------- Types ----------

export interface ZerionPosition {
  type: string;
  id: string;
  attributes: {
    parent: string | null;
    protocol: string | null;
    name: string;
    position_type: string;
    quantity: {
      int: string;
      decimals: number;
      float: number;
      numeric: string;
    };
    value: number | null;
    price: number;
    changes: {
      absolute_1d: number | null;
      percent_1d: number | null;
    } | null;
    fungible_info: {
      name: string;
      symbol: string;
      icon: { url: string } | null;
      flags: { verified: boolean };
    };
    flags: {
      displayable: boolean;
    };
  };
}

export interface ZerionTransaction {
  type: string;
  id: string;
  attributes: {
    operation_type: string;
    hash: string;
    mined_at_block: number;
    mined_at: string;
    sent_from: string;
    sent_to: string;
    status: string;
    nonce: number;
    fee: { value: number; price: number } | null;
    transfers: Array<{
      direction: string;
      fungible_info: {
        name: string;
        symbol: string;
      };
      quantity: { float: number };
      value: number | null;
      price: number | null;
    }>;
  };
}

export interface ZerionFungible {
  type: string;
  id: string;
  attributes: {
    name: string;
    symbol: string;
    description: string | null;
    icon: { url: string } | null;
    flags: { verified: boolean };
    market_data: {
      total_supply: number;
      circulating_supply: number;
      market_cap: number;
      fully_diluted_valuation: number;
      price: number;
      changes: {
        percent_1d: number | null;
        percent_30d: number | null;
        percent_90d: number | null;
        percent_365d: number | null;
      };
    };
  };
}

// ---------- API Functions ----------

/**
 * Get all token positions for a wallet address.
 * Optionally filter by chain (e.g. "solana", "ethereum").
 */
export async function getWalletPortfolio(
  address: string,
  chain?: string
): Promise<ZerionPosition[] | null> {
  let path = `/wallets/${address}/positions/?filter[positions]=only_simple&currency=usd`;
  if (chain) {
    path += `&filter[chain_ids]=${chain}`;
  }
  const data = await zerionFetch<{ data: ZerionPosition[] }>(path);
  return data?.data ?? null;
}

/**
 * Get transaction history for a wallet address.
 */
export async function getWalletTransactions(
  address: string,
  chain?: string
): Promise<ZerionTransaction[] | null> {
  let path = `/wallets/${address}/transactions/?currency=usd&page[size]=50`;
  if (chain) {
    path += `&filter[chain_ids]=${chain}`;
  }
  const data = await zerionFetch<{ data: ZerionTransaction[] }>(path);
  return data?.data ?? null;
}

/**
 * Get token/fungible info including price and market data.
 * The tokenId is the Zerion fungible ID (e.g. "solana" or a contract address).
 */
export async function getTokenPrice(
  tokenId: string
): Promise<ZerionFungible | null> {
  const path = `/fungibles/${tokenId}/?currency=usd`;
  const data = await zerionFetch<{ data: ZerionFungible }>(path);
  return data?.data ?? null;
}

/**
 * Get information about a specific chain.
 */
export async function getChainInfo(
  chainId: string
): Promise<{ name: string; icon: string | null; explorer_url: string | null } | null> {
  const data = await zerionFetch<{
    data: {
      attributes: {
        name: string;
        icon: { url: string } | null;
        explorer: { home_url: string } | null;
      };
    };
  }>(`/chains/${chainId}`);
  if (!data?.data) return null;
  return {
    name: data.data.attributes.name,
    icon: data.data.attributes.icon?.url ?? null,
    explorer_url: data.data.attributes.explorer?.home_url ?? null,
  };
}

/**
 * Fetch Solana token prices from Zerion.
 * Returns a map of symbol -> price in USD.
 */
export async function getSolanaTokenPrices(
  walletAddress: string
): Promise<Map<string, { priceUsd: number; change24h: number | null }>> {
  const prices = new Map<
    string,
    { priceUsd: number; change24h: number | null }
  >();

  const positions = await getWalletPortfolio(walletAddress, "solana");
  if (!positions) return prices;

  for (const pos of positions) {
    const { symbol } = pos.attributes.fungible_info;
    const price = pos.attributes.price;
    const change = pos.attributes.changes?.percent_1d ?? null;
    if (price > 0) {
      prices.set(symbol, { priceUsd: price, change24h: change });
    }
  }

  return prices;
}
