import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis, { initRedis, getRedis } from '../config/redis.js';

const isRedisReady = () => {
  const r = getRedis();
  return Boolean(r && r.status === 'ready');
};

const createLimiter = ({ windowMs, max, prefix }) => {
  initRedis();

  const base = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
    keyGenerator: (req) => {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return `${prefix}:${ip}`;
    },
  };

  if (!isRedisReady()) {
    return rateLimit(base);
  }

  return rateLimit({
    ...base,
    store: new RedisStore({
      sendCommand: async (...args) => redis.call(...args),
    }),
  });
};

export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  prefix: 'rl:auth',
});

export const messagesLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  prefix: 'rl:messages',
});
