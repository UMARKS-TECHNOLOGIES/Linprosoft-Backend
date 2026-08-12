import { createClient, RedisClientType } from "redis";
import { env } from "./environment";

let client: RedisClientType | null = null;

export const getRedisClient = (): RedisClientType => {
  if (client) return client;

  client = createClient({ url: env.REDIS_URL });

  client.on("error", (err) => {
    // Fail loudly in logs but allow the app to continue (cache is optional)
    // Individual callers should handle missing cache gracefully.
    // eslint-disable-next-line no-console
    console.error("Redis Client Error:", err);
  });

  // Connect asynchronously; don't await here to avoid blocking startup.
  client.connect().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to Redis:", err?.message || err);
  });

  return client;
};

export default getRedisClient;
