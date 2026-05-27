import redis from './mem/redis';

const LIMIT = 5;
const WINDOW_MS = 10; // seconds

export async function isRateLimited(ip: string): Promise<boolean> {
  const key = `ratelimit:${ip}`;

  const count = await redis.incr(key);
  if (count === 1) {
    // First hit — set expiry
    await redis.expire(key, WINDOW_MS);
  }

  return count > LIMIT;
}