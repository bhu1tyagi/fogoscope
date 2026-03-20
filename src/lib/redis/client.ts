import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let isRedisAvailable = false;

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 5) {
        console.warn(
          `[Redis] Retry limit reached after ${times} attempts. Backing off.`
        );
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ["READONLY", "ECONNRESET", "ECONNREFUSED"];
      return targetErrors.some((e) => err.message.includes(e));
    },
    lazyConnect: false,
  });

  client.on("connect", () => {
    isRedisAvailable = true;
    console.log("[Redis] Connected successfully.");
  });

  client.on("ready", () => {
    isRedisAvailable = true;
  });

  client.on("error", (err: Error) => {
    isRedisAvailable = false;
    console.error("[Redis] Connection error:", err.message);
  });

  client.on("close", () => {
    isRedisAvailable = false;
    console.warn("[Redis] Connection closed.");
  });

  client.on("end", () => {
    isRedisAvailable = false;
  });

  return client;
}

const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export { redis, isRedisAvailable };
export default redis;
