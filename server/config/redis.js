import Redis from 'ioredis';

let redis = null;

export const getRedis = () => redis;

export const getRedisStatus = () => {
  if (!redis) return 'not_initialized';
  return redis.status || 'unknown';
};

export const initRedis = () => {
  if (redis) return redis;

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined;

  redis = new Redis({
    host,
    port,
    password,
    db,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });

  redis.on('error', (err) => {
    console.error('Redis error:', err?.message || err);
  });

  redis.on('connect', () => {
    console.log('Redis connected');
  });

  redis.on('ready', () => {
    console.log('Redis ready');
  });

  redis
    .connect()
    .then(() => {
      console.log(`Redis status: ${getRedisStatus()}`);
    })
    .catch(() => {
      console.log(`Redis status: ${getRedisStatus()}`);
    });

  return redis;
};

export default initRedis();
