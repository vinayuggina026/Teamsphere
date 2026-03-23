import redis, { initRedis, getRedis } from '../config/redis.js';

const isRedisReady = () => {
  const r = getRedis();
  return Boolean(r && r.status === 'ready');
};

const safeJsonParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

export const getCache = async (key) => {
  try {
    initRedis();
    if (!isRedisReady()) return null;
    const data = await redis.get(key);
    return data ? safeJsonParse(data) : null;
  } catch {
    return null;
  }
};

export const setCache = async (key, value, ttlSeconds = 60) => {
  try {
    initRedis();
    if (!isRedisReady()) return;
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // ignore cache failures
  }
};

export const delCache = async (key) => {
  try {
    initRedis();
    if (!isRedisReady()) return;
    await redis.del(key);
  } catch {
    // ignore
  }
};

export const delCacheMany = async (keys) => {
  try {
    initRedis();
    if (!isRedisReady()) return;
    const uniq = Array.from(new Set(keys.filter(Boolean)));
    if (uniq.length === 0) return;
    await redis.del(...uniq);
  } catch {
    // ignore
  }
};

export const cacheWrap = async ({ key, ttlSeconds, getFresh }) => {
  const cached = await getCache(key);
  if (cached) return { hit: true, value: cached };
  const fresh = await getFresh();
  await setCache(key, fresh, ttlSeconds);
  return { hit: false, value: fresh };
};
