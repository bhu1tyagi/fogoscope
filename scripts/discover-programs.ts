/**
 * Discovery script: finds on-chain program IDs used by Fogo DEX pairs.
 *
 * Usage:  npx tsx scripts/discover-programs.ts
 *
 * 1. Fetches Fogo pairs from DEX Screener
 * 2. For each pair, gets recent transactions via Fogo RPC
 * 3. Extracts unique program IDs from those transactions
 * 4. Prints the discovered program IDs
 */

import { Connection, PublicKey } from "@solana/web3.js";

// --- Direct imports (no @/ aliases — this runs standalone via tsx) ---

const DEX_SCREENER_BASE = "https://api.dexscreener.com";

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string;
}

interface SearchResponse {
  pairs: DexScreenerPair[] | null;
}

async function fetchFogoPairs(): Promise<DexScreenerPair[]> {
  const url = `${DEX_SCREENER_BASE}/latest/dex/search?q=fogo`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`DEX Screener request failed: ${res.status}`);
    return [];
  }
  const data: SearchResponse = await res.json();
  return data.pairs ?? [];
}

async function main() {
  console.log("=== FogoScope Program Discovery ===\n");

  // 1. RPC connection
  const rpcUrl = process.env.FOGO_RPC_URL || "https://mainnet.fogo.io";
  const connection = new Connection(rpcUrl, "confirmed");
  console.log(`RPC: ${rpcUrl}`);

  // 2. Fetch pairs from DEX Screener
  console.log("\nFetching Fogo pairs from DEX Screener...");
  const pairs = await fetchFogoPairs();
  console.log(`Found ${pairs.length} pairs\n`);

  if (pairs.length === 0) {
    console.log("No pairs found. Exiting.");
    return;
  }

  const discoveredPrograms = new Map<string, Set<string>>();

  // 3. For each pair, look up recent transactions
  for (const pair of pairs.slice(0, 10)) {
    const label = `${pair.baseToken.symbol}/${pair.quoteToken.symbol} on ${pair.dexId}`;
    console.log(`\nAnalysing pair: ${label}`);
    console.log(`  Pair address: ${pair.pairAddress}`);

    let pairPubkey: PublicKey;
    try {
      pairPubkey = new PublicKey(pair.pairAddress);
    } catch {
      console.log("  Skipping (invalid public key)");
      continue;
    }

    // Fetch a small number of recent signatures
    let signatures;
    try {
      signatures = await connection.getSignaturesForAddress(pairPubkey, {
        limit: 5,
      });
    } catch (err) {
      console.log(`  Could not fetch signatures: ${err}`);
      continue;
    }

    console.log(`  Recent signatures: ${signatures.length}`);

    // 4. Fetch transactions and extract program IDs
    for (const sigInfo of signatures) {
      try {
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx || !tx.transaction) continue;

        const message = tx.transaction.message;
        const accountKeys =
          "staticAccountKeys" in message
            ? (message as { staticAccountKeys: PublicKey[] }).staticAccountKeys
            : (message as { accountKeys: PublicKey[] }).accountKeys;

        // In versioned transactions, instructions reference programs by index
        const instructions =
          "compiledInstructions" in message
            ? (
                message as {
                  compiledInstructions: { programIdIndex: number }[];
                }
              ).compiledInstructions
            : (message as { instructions: { programIdIndex: number }[] })
                .instructions;

        for (const ix of instructions) {
          const programPubkey = accountKeys[ix.programIdIndex];
          if (!programPubkey) continue;

          const programId = programPubkey.toBase58();

          // Skip well-known system programs
          if (isSystemProgram(programId)) continue;

          if (!discoveredPrograms.has(programId)) {
            discoveredPrograms.set(programId, new Set());
          }
          discoveredPrograms.get(programId)!.add(pair.dexId);
        }
      } catch {
        // Individual tx errors are non-fatal
      }
    }
  }

  // 5. Print results
  console.log("\n=== Discovered Program IDs ===\n");

  if (discoveredPrograms.size === 0) {
    console.log("No non-system program IDs discovered.");
    return;
  }

  const sorted = [...discoveredPrograms.entries()].sort(
    (a, b) => b[1].size - a[1].size
  );

  for (const [programId, dexes] of sorted) {
    console.log(`  ${programId}`);
    console.log(`    Seen in DEXes: ${[...dexes].join(", ")}`);
  }

  console.log(`\nTotal unique programs: ${discoveredPrograms.size}`);

  // Output as JSON for easy copy-paste into program-ids.ts
  console.log("\n--- JSON (for program-ids.ts) ---");
  const obj: Record<string, string> = {};
  let i = 0;
  for (const [programId] of sorted) {
    obj[`PROGRAM_${i}`] = programId;
    i++;
  }
  console.log(JSON.stringify(obj, null, 2));
}

/** Returns true for well-known Solana system / SPL program addresses. */
function isSystemProgram(id: string): boolean {
  const SYSTEM_PROGRAMS = new Set([
    "11111111111111111111111111111111", // System Program
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // Token Program
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // Associated Token
    "ComputeBudget111111111111111111111111111111", // Compute Budget
    "SysvarRent111111111111111111111111111111111", // Rent sysvar
    "SysvarC1ock11111111111111111111111111111111", // Clock sysvar
    "Sysvar1nstructions1111111111111111111111111", // Instructions sysvar
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr", // Memo v2
    "Memo1UhkJBfCR6MNB3fnjDrrjBGHGE5cKfJs9URGCH2", // Memo v1
  ]);
  return SYSTEM_PROGRAMS.has(id);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
