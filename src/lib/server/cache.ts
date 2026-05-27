import redis from './redis';

const DEFAULT_TTL = 60; // seconds

export async function getCache<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL
): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}

// Invalidate multiple keys by pattern e.g. 'locations:*'
export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}