import Redis from 'ioredis';

import { REDIS_URL } from '$env/static/private';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying
    return Math.min(times * 200, 1000);
  }
});

redis.on('error', (err) => console.error('[redis]', err));
redis.on('connect', () => console.log('[redis] connected'));

export default redis;