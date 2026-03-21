import { PublicKey } from "@solana/web3.js";
import type { VersionedTransactionResponse, TokenBalance } from "@solana/web3.js";
import { BaseWorker } from "./base-worker";
import { fogoConnection } from "../lib/blockchain/connection";
import { PROGRAM_IDS, KNOWN_PAIRS, MINT_SYMBOLS } from "../lib/blockchain/program-ids";
import { prisma } from "../lib/db/prisma";
import { getCached } from "../lib/redis/cache";

/** Pool address → pair name lookup */
const POOL_ADDRESSES = new Set<string>(KNOWN_PAIRS.map((p) => p.pairAddress));

const ROUTER_ID = PROGRAM_IDS.VALIANT_ROUTER;

/**
 * Polls Fogo RPC for new Valiant Router swap transactions,
 * parses token balance changes, and writes Trade rows to the DB.
 */
export class TradeCollector extends BaseWorker {
  name = "TradeCollector";
  intervalMs = 3_000;

  private lastSignature: string | undefined;

  async execute(): Promise<void> {
    const routerPubkey = new PublicKey(ROUTER_ID);

    // Fetch recent signatures for the router program
    const signatures = await fogoConnection.getSignaturesForAddress(routerPubkey, {
      limit: 25,
      ...(this.lastSignature ? { until: this.lastSignature } : {}),
    });

    if (signatures.length === 0) return;

    // Update bookmark to newest signature
    this.lastSignature = signatures[0].signature;

    // Filter out errored transactions
    const validSigs = signatures.filter((s) => s.err === null);
    if (validSigs.length === 0) return;

    // Ensure price cache is warm before processing trades
    await refreshPriceCache();

    let written = 0;
    let skipped = 0;

    for (const sigInfo of validSigs) {
      try {
        const tx = await fogoConnection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta) continue;

        // Only process transactions with Swap or TwoHopSwap instructions
        const logs = tx.meta.logMessages ?? [];
        const isSwap = logs.some(
          (l) => l.includes("Instruction: Swap") || l.includes("Instruction: TwoHopSwap")
        );
        if (!isSwap) continue;

        const trades = parseSwapTrades(tx, sigInfo.signature);

        for (const trade of trades) {
          try {
            await prisma.trade.create({ data: trade });
            written++;
          } catch (err: unknown) {
            // Duplicate signature — skip
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("Unique constraint")) {
              skipped++;
            } else {
              throw err;
            }
          }
        }
      } catch (err) {
        console.error(`[${this.name}] Error processing ${sigInfo.signature.slice(0, 20)}:`, err);
      }
    }

    console.log(
      `[${this.name}] Processed ${validSigs.length} txns, wrote ${written} trades, skipped ${skipped}`
    );
  }
}

/**
 * Parse a swap transaction into Trade DB records by analysing
 * pre/post token balance changes.
 */
function parseSwapTrades(
  tx: VersionedTransactionResponse,
  signature: string
): Array<{
  signature: string;
  timestamp: Date;
  slot: bigint;
  dex: string;
  pair: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  amountInUsd: number | null;
  amountOutUsd: number | null;
  slippageBps: number | null;
  priceImpact: number | null;
  executionTimeMs: number | null;
  wallet: string;
  fee: number | null;
}> {
  const meta = tx.meta!;
  const pre = meta.preTokenBalances ?? [];
  const post = meta.postTokenBalances ?? [];
  const slot = BigInt(tx.slot);
  const blockTime = tx.blockTime;
  const timestamp = blockTime ? new Date(blockTime * 1000) : new Date();

  // Compute balance changes grouped by owner+mint
  const changes = computeBalanceChanges(pre, post);

  // Find user wallets: owners with balance changes that are not pool addresses
  const userChanges = new Map<string, Map<string, number>>();
  for (const [key, diff] of changes) {
    const [owner, mint] = key.split(":");
    if (POOL_ADDRESSES.has(owner)) continue; // skip pool changes
    if (Math.abs(diff) < 0.0000001) continue;

    if (!userChanges.has(owner)) userChanges.set(owner, new Map());
    userChanges.get(owner)!.set(mint, diff);
  }

  const results: ReturnType<typeof parseSwapTrades> = [];

  for (const [wallet, mintChanges] of userChanges) {
    // A swap = one mint decreases (tokenIn), another increases (tokenOut)
    let tokenIn = "";
    let tokenOut = "";
    let amountIn = 0;
    let amountOut = 0;

    for (const [mint, diff] of mintChanges) {
      if (diff < 0) {
        tokenIn = mint;
        amountIn = Math.abs(diff);
      } else if (diff > 0) {
        tokenOut = mint;
        amountOut = diff;
      }
    }

    // Must have both a token in and token out
    if (!tokenIn || !tokenOut || amountIn === 0 || amountOut === 0) continue;

    // Determine pair name from pool address or from token symbols
    let pair = determinePair(tokenIn, tokenOut);

    // Look up USD prices from cache
    const inSymbol = MINT_SYMBOLS[tokenIn] ?? tokenIn.slice(0, 8);
    const outSymbol = MINT_SYMBOLS[tokenOut] ?? tokenOut.slice(0, 8);
    const inPriceUsd = getTokenPrice(inSymbol);
    const outPriceUsd = getTokenPrice(outSymbol);

    const amountInUsd = inPriceUsd ? amountIn * inPriceUsd : null;
    const amountOutUsd = outPriceUsd ? amountOut * outPriceUsd : null;

    // Slippage: compute from USD price impact.
    // Guards: both prices must be known, both USD amounts > $0.10,
    // and result within -100 to +200 bps (realistic DEX range for low-liq pairs).
    let slippageBps: number | null = null;
    let priceImpact: number | null = null;
    if (
      inPriceUsd !== null && inPriceUsd > 0 &&
      outPriceUsd !== null && outPriceUsd > 0 &&
      amountInUsd !== null && amountInUsd > 0.1 &&
      amountOutUsd !== null && amountOutUsd > 0.1
    ) {
      const rawImpact = ((amountInUsd - amountOutUsd) / amountInUsd) * 100;
      const rawSlippage = rawImpact * 100; // convert % to bps
      // Only keep if within realistic range — reject obvious price estimation errors
      if (rawSlippage >= -100 && rawSlippage <= 200) {
        priceImpact = Math.round(rawImpact * 10000) / 10000;
        slippageBps = Math.round(rawSlippage * 100) / 100;
      }
    }

    // Transaction fee in SOL (lamports → SOL)
    const fee = meta.fee ? meta.fee / 1e9 : null;

    results.push({
      signature,
      timestamp,
      slot,
      dex: "valiant",
      pair,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      amountInUsd: amountInUsd ? Math.round(amountInUsd * 100) / 100 : null,
      amountOutUsd: amountOutUsd ? Math.round(amountOutUsd * 100) / 100 : null,
      slippageBps,
      priceImpact,
      executionTimeMs: null,
      wallet,
      fee,
    });
  }

  return results;
}

/**
 * Compute per-owner+mint balance changes from pre/post token balances.
 */
function computeBalanceChanges(
  pre: readonly TokenBalance[],
  post: readonly TokenBalance[]
): Map<string, number> {
  const balances = new Map<string, { pre: number; post: number }>();

  for (const b of pre) {
    const key = `${b.owner}:${b.mint}`;
    const existing = balances.get(key) ?? { pre: 0, post: 0 };
    existing.pre = parseFloat(b.uiTokenAmount.uiAmountString ?? "0");
    balances.set(key, existing);
  }
  for (const b of post) {
    const key = `${b.owner}:${b.mint}`;
    const existing = balances.get(key) ?? { pre: 0, post: 0 };
    existing.post = parseFloat(b.uiTokenAmount.uiAmountString ?? "0");
    balances.set(key, existing);
  }

  const changes = new Map<string, number>();
  for (const [key, val] of balances) {
    const diff = val.post - val.pre;
    if (Math.abs(diff) > 0.0000001) {
      changes.set(key, diff);
    }
  }
  return changes;
}

/** Stablecoins and quote currencies — always go second in a pair name */
const QUOTE_TOKENS = new Set(["USDC.s", "USDC", "USDT", "FOGO"]);

/**
 * Determine pair name from token mints using known pairs and mint symbols.
 */
function determinePair(tokenIn: string, tokenOut: string): string {
  const inSym = MINT_SYMBOLS[tokenIn] ?? tokenIn.slice(0, 8);
  const outSym = MINT_SYMBOLS[tokenOut] ?? tokenOut.slice(0, 8);

  // Check if this matches a known pair (in either order)
  for (const kp of KNOWN_PAIRS) {
    const [base, quote] = kp.name.split("/");
    if (
      (inSym === base && outSym === quote) ||
      (inSym === quote && outSym === base)
    ) {
      return kp.name;
    }
  }

  // Fallback: put the non-stablecoin/non-quote token first (base/quote convention)
  if (QUOTE_TOKENS.has(inSym) && !QUOTE_TOKENS.has(outSym)) {
    return `${outSym}/${inSym}`;
  }
  return `${inSym}/${outSym}`;
}

/** In-memory price cache: symbol (lowercase) → USD price */
const priceCache = new Map<string, number>();
let priceCacheAge = 0;

/**
 * Refresh price cache from Redis (keyed by mint address) and DB fallback.
 * Must be awaited before using the cache.
 */
async function refreshPriceCache(): Promise<void> {
  if (Date.now() - priceCacheAge < 15_000) return;
  priceCacheAge = Date.now();

  for (const [mint, symbol] of Object.entries(MINT_SYMBOLS)) {
    try {
      const cached = await getCached<{ priceUsd: number }>(`rt:price:fogo:${mint}`);
      if (cached?.priceUsd) {
        priceCache.set(symbol.toLowerCase(), cached.priceUsd);
        continue;
      }
    } catch {
      // ignore
    }

    try {
      const row = await prisma.tokenPrice.findFirst({
        where: { chain: "fogo", symbol },
        orderBy: { timestamp: "desc" },
        select: { priceUsd: true },
      });
      if (row) {
        priceCache.set(symbol.toLowerCase(), row.priceUsd.toNumber());
      }
    } catch {
      // ignore
    }
  }
}

function getTokenPrice(symbol: string): number | null {
  return priceCache.get(symbol.toLowerCase()) ?? null;
}
