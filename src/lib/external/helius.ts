/**
 * Helius enhanced API client for Solana.
 *
 * Provides enriched transaction data, token metadata, and DAS API
 * beyond what standard Solana RPC offers. Used for the Fogo vs Solana
 * comparison engine and wallet analysis.
 *
 * HELIUS_API_KEY is the full dedicated RPC URL (e.g. https://xxx.helius-rpc.com)
 * Docs: https://docs.helius.dev
 */

/**
 * Get the Helius RPC URL. HELIUS_API_KEY stores the full dedicated URL.
 */
function rpcUrl(): string | null {
  return process.env.HELIUS_API_KEY || null;
}

/**
 * Build an API URL. For dedicated endpoints the enhanced API is
 * accessed by POSTing to the same RPC URL.
 */
function apiUrl(_path: string): string | null {
  return rpcUrl();
}

// ---------- Types ----------

export interface HeliusEnhancedTransaction {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      userAccount: string;
      tokenAccount: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      mint: string;
    }>;
  }>;
  events: Record<string, unknown>;
}

export interface HeliusTokenMetadata {
  account: string;
  onChainAccountInfo: {
    accountInfo: {
      key: string;
      isSigner: boolean;
      isWritable: boolean;
      lamports: number;
      data: {
        parsed: {
          info: {
            decimals: number;
            freezeAuthority: string;
            isInitialized: boolean;
            mintAuthority: string;
            supply: string;
          };
          type: string;
        };
        program: string;
        space: number;
      };
    };
  };
  onChainMetadata: {
    metadata: {
      name: string;
      symbol: string;
      uri: string;
    } | null;
  } | null;
  offChainMetadata: {
    metadata: {
      name: string;
      symbol: string;
      image: string;
    } | null;
  } | null;
}

export interface HeliusDASAsset {
  id: string;
  interface: string;
  content: {
    json_uri: string;
    metadata: {
      name: string;
      symbol: string;
    };
    links: Record<string, string>;
  };
  token_info?: {
    balance: number;
    decimals: number;
    token_program: string;
    price_info?: {
      price_per_token: number;
      total_price: number;
      currency: string;
    };
  };
}

// ---------- API Functions ----------

/**
 * Parse and enrich transaction signatures using Helius Enhanced Transactions API.
 * Returns enriched transaction data with human-readable descriptions.
 * Max 100 signatures per request.
 */
export async function getEnhancedTransactions(
  signatures: string[]
): Promise<HeliusEnhancedTransaction[] | null> {
  const url = apiUrl("/transactions");
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: signatures.slice(0, 100) }),
    });
    if (!res.ok) {
      console.warn(`[Helius] Enhanced tx ${res.status}`);
      return null;
    }
    return res.json() as Promise<HeliusEnhancedTransaction[]>;
  } catch (err) {
    console.warn("[Helius] Enhanced tx request failed:", err);
    return null;
  }
}

/**
 * Get metadata for token mint accounts.
 * Max 100 mints per request.
 */
export async function getTokenMetadata(
  mintAccounts: string[]
): Promise<HeliusTokenMetadata[] | null> {
  const url = apiUrl("/token-metadata");
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mintAccounts: mintAccounts.slice(0, 100),
        includeOffChain: true,
        disableCache: false,
      }),
    });
    if (!res.ok) {
      console.warn(`[Helius] Token metadata ${res.status}`);
      return null;
    }
    return res.json() as Promise<HeliusTokenMetadata[]>;
  } catch (err) {
    console.warn("[Helius] Token metadata request failed:", err);
    return null;
  }
}

/**
 * Get all assets owned by a wallet using the DAS (Digital Asset Standard) API.
 * Uses the Helius RPC endpoint with the DAS method.
 */
export async function getAssetsByOwner(
  ownerAddress: string,
  page = 1,
  limit = 100
): Promise<HeliusDASAsset[] | null> {
  const url = rpcUrl();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "fogoscope-das",
        method: "getAssetsByOwner",
        params: {
          ownerAddress,
          page,
          limit,
          displayOptions: {
            showFungible: true,
            showNativeBalance: true,
          },
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[Helius] DAS getAssetsByOwner ${res.status}`);
      return null;
    }
    const data = await res.json() as {
      result?: { items: HeliusDASAsset[] };
    };
    return data.result?.items ?? null;
  } catch (err) {
    console.warn("[Helius] DAS request failed:", err);
    return null;
  }
}

/**
 * Check if Helius API is configured and available.
 */
export function isHeliusConfigured(): boolean {
  return !!rpcUrl();
}
