import { redis, isRedisAvailable } from "./client";

/**
 * Cache tiers with TTL values in seconds.
 * REALTIME: 5s  — live price feeds, current block data
 * AGGREGATED: 60s — rolled-up metrics, recent aggregations
 * HISTORICAL: 300s — historical data, protocol-level stats
 */
export enum CacheTier {
  REALTIME = 5,
  AGGREGATED = 60,
  HISTORICAL = 300,
}

/**
 * Retrieve a cached value by key.
 * Returns null if Redis is unavailable or the key does not exist.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) {
    return null;
  }

  try {
    const raw = await redis.get(key);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[Cache] Error reading key "${key}":`, err);
    return null;
  }
}

/**
 * Write a value to cache with a TTL determined by the CacheTier.
 * Silently no-ops if Redis is unavailable.
 */
export async function setCache(
  key: string,
  value: unknown,
  tier: CacheTier
): Promise<void> {
  if (!isRedisAvailable) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, "EX", tier);
  } catch (err) {
    console.error(`[Cache] Error writing key "${key}":`, err);
  }
}

/**
 * Cache-through helper: returns the cached value if present,
 * otherwise calls `fetcher`, caches the result, and returns it.
 * If Redis is unavailable, calls `fetcher` directly every time.
 */
export async function getOrFetch<T>(
  key: string,
  tier: CacheTier,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();

  // Cache in the background — don't block the return
  setCache(key, fresh, tier).catch((err) => {
    console.error(`[Cache] Background setCache failed for "${key}":`, err);
  });

  return fresh;
}
