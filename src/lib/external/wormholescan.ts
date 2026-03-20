const BASE_URL = "https://api.wormholescan.io/api/v1";

/** Wormhole chain ID for Fogo. */
const FOGO_CHAIN_ID = 51;

/** A cross-chain transfer (VAA) as returned by Wormholescan. */
export interface WormholeTransfer {
  id: string;
  emitterChain: number;
  emitterAddress: string;
  targetChain: number;
  sequence: string;
  timestamp: string;
  vaa: string;
  tokenAmount?: string;
  usdAmount?: string;
  sourceChainName?: string;
  targetChainName?: string;
  status: string;
}

interface TransfersResponse {
  transactions: WormholeTransfer[];
}

/**
 * Fetch recent inbound transfers to Fogo (targetChain = 51).
 * Returns an empty array on failure.
 */
export async function getInboundTransfers(
  limit: number = 20
): Promise<WormholeTransfer[]> {
  try {
    const url = `${BASE_URL}/transactions?targetChain=${FOGO_CHAIN_ID}&pageSize=${limit}&sortOrder=DESC`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(
        `[Wormholescan] getInboundTransfers failed: ${res.status} ${res.statusText}`
      );
      return [];
    }

    const data: TransfersResponse = await res.json();
    return data.transactions ?? [];
  } catch (err) {
    console.error("[Wormholescan] getInboundTransfers error:", err);
    return [];
  }
}

/**
 * Fetch recent outbound transfers from Fogo (emitterChain = 51).
 * Returns an empty array on failure.
 */
export async function getOutboundTransfers(
  limit: number = 20
): Promise<WormholeTransfer[]> {
  try {
    const url = `${BASE_URL}/transactions?emitterChain=${FOGO_CHAIN_ID}&pageSize=${limit}&sortOrder=DESC`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(
        `[Wormholescan] getOutboundTransfers failed: ${res.status} ${res.statusText}`
      );
      return [];
    }

    const data: TransfersResponse = await res.json();
    return data.transactions ?? [];
  } catch (err) {
    console.error("[Wormholescan] getOutboundTransfers error:", err);
    return [];
  }
}
