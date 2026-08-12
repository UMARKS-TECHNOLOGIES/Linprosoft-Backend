import getRedisClient from "../config/redis";

const redis = getRedisClient();

export const setCache = async (key: string, value: unknown, ttlSeconds?: number): Promise<boolean> => {
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, payload, { EX: ttlSeconds });
    } else {
      await redis.set(key, payload);
    }
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("setCache error", err);
    return false;
  }
};

export const getCache = async <T = any>(key: string): Promise<T | null> => {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("getCache error", err);
    return null;
  }
};

export const delCache = async (key: string): Promise<boolean> => {
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("delCache error", err);
    return false;
  }
};

export const wrapCache = async <T = any>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> => {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();
  // Best-effort set; ignore failures
  void setCache(key, value, ttlSeconds);
  return value;
};

export default {
  set: setCache,
  get: getCache,
  del: delCache,
  wrap: wrapCache,
};
