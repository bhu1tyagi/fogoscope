import { BaseWorker } from "./base-worker";
import { getFogoPairs, type DexScreenerPair } from "../lib/external/dex-screener";
import { prisma } from "../lib/db/prisma";
import { setCache, CacheTier } from "../lib/redis/cache";

/**
 * Fetches token prices from DEX Screener (primary, Fogo-native)
 * and Zerion (secondary, Solana cross-chain) every 15 seconds.
 */
export class PriceCollector extends BaseWorker {
  name = "PriceCollector";
  intervalMs = 15_000;

  async execute(): Promise<void> {
    const priceRecords: Array<{
      timestamp: Date;
      token: string;
      symbol: string;
      chain: string;
      priceUsd: number;
      volume24h: number;
      liquidity: number;
      change24h: number | null;
      source: string;
    }> = [];

    const now = new Date();

    // --- Source 1: DEX Screener (Fogo-native pairs) ---
    // Collect the best quote-token derivation per address (highest-liquidity pair wins).
    const derivedQuotes = new Map<
      string,
      { symbol: string; chain: string; priceUsd: number; liquidity: number; source: string }
    >();

    try {
      const pairs: DexScreenerPair[] = await getFogoPairs();

      if (pairs && pairs.length > 0) {
        for (const pair of pairs) {
          const priceUsd = parseFloat(pair.priceUsd);
          if (isNaN(priceUsd) || priceUsd <= 0) continue;

          priceRecords.push({
            timestamp: now,
            token: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            chain: pair.chainId,
            priceUsd,
            volume24h: pair.volume?.h24 ?? 0,
            liquidity: pair.liquidity?.usd ?? 0,
            change24h: null,
            source: `dexscreener:${pair.dexId}`,
          });

          // Derive quote token price: quoteUsd = baseUsd / priceNative
          const priceNative = parseFloat(pair.priceNative);
          if (isNaN(priceNative) || priceNative <= 0) continue;

          const quotePriceUsd = priceUsd / priceNative;
          if (!isFinite(quotePriceUsd) || quotePriceUsd <= 0) continue;

          const quoteAddr = pair.quoteToken.address;
          const pairLiq = pair.liquidity?.usd ?? 0;
          const existing = derivedQuotes.get(quoteAddr);

          if (!existing || pairLiq > existing.liquidity) {
            derivedQuotes.set(quoteAddr, {
              symbol: pair.quoteToken.symbol,
              chain: pair.chainId,
              priceUsd: quotePriceUsd,
              liquidity: pairLiq,
              source: `dexscreener:${pair.dexId}:derived`,
            });
          }
        }

        // Append the best derivation for each quote token
        for (const [addr, q] of derivedQuotes) {
          priceRecords.push({
            timestamp: now,
            token: addr,
            symbol: q.symbol,
            chain: q.chain,
            priceUsd: q.priceUsd,
            volume24h: 0,
            liquidity: q.liquidity,
            change24h: null,
            source: q.source,
          });
        }

        console.log(
          `[${this.name}] DEX Screener: ${priceRecords.length} prices (${derivedQuotes.size} derived quote tokens) from ${pairs.length} pairs`
        );
      } else {
        console.log(`[${this.name}] DEX Screener: no pairs returned`);
      }
    } catch (err) {
      console.error(`[${this.name}] DEX Screener fetch failed:`, err);
    }

    // Note: Zerion was previously used for Solana-side token prices but the
    // fungible IDs don't work with their API. DEX Screener covers all needed
    // Fogo token prices. Zerion client remains in src/lib/external/zerion.ts
    // for future use (wallet analysis, cross-chain portfolio data).

    // --- Persist to DB ---
    if (priceRecords.length > 0) {
      try {
        await prisma.tokenPrice.createMany({
          data: priceRecords,
          skipDuplicates: true,
        });
      } catch (err) {
        console.error(`[${this.name}] DB write failed:`, err);
      }
    }

    // --- Update Redis cache ---
    for (const record of priceRecords) {
      try {
        await setCache(
          `rt:price:${record.chain}:${record.token}`,
          {
            symbol: record.symbol,
            priceUsd: record.priceUsd,
            volume24h: record.volume24h,
            liquidity: record.liquidity,
            change24h: record.change24h,
            source: record.source,
            updatedAt: Date.now(),
          },
          CacheTier.REALTIME
        );
      } catch (err) {
        console.error(
          `[${this.name}] Redis cache update failed for ${record.symbol}:`,
          err
        );
      }
    }
  }
}
