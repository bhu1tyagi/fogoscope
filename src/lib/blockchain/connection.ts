import { Connection } from "@solana/web3.js";

/**
 * Fogo L1 RPC connection.
 */
export const fogoConnection = new Connection(
  process.env.FOGO_RPC_URL || "https://mainnet.fogo.io",
  "confirmed"
);

/**
 * Solana mainnet RPC connection via Helius.
 * Uses HELIUS_API_KEY as the full dedicated RPC URL (no separate api-key param needed).
 * Falls back to SOLANA_RPC_URL, then to the public endpoint.
 */
export const solanaConnection = new Connection(
  process.env.HELIUS_API_KEY ||
    process.env.SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com",
  "confirmed"
);
