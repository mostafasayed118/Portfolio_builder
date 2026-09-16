import rateLimit, { ipKeyGenerator, type Store } from "express-rate-limit";
import type { RedisReply } from "rate-limit-redis";
import { logger } from "../lib/logger";
import { env } from "../lib/env";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

// Evaluated per-request (not captured at import) so env overrides and
// test stubs are honored, and so production never honors the dev flag.
const skipIfDev = () => env.DISABLE_RATE_LIMIT && !env.IS_PRODUCTION;

if (env.DISABLE_RATE_LIMIT) {
  if (env.IS_PRODUCTION) {
    logger.error("Rate limiting DISABLED via DISABLE_RATE_LIMIT — ignored in production. Limits stay active.");
  } else {
    logger.warn("Rate limiting DISABLED — DISABLE_RATE_LIMIT=true (non-production only).");
  }
}

/**
 * Narrows an ioredis reply to the raw shape rate-limit-redis expects
 * (scalars or flat arrays of scalars — its Lua scripts return e.g.
 * [count, ttl]). ioredis's `call` resolves `unknown`; instead of an unsafe
 * cast we fail fast on protocol violations so a misbehaving Redis never
 * poisons limit counts.
 */
function isRedisData(value: unknown): value is boolean | number | string {
  return typeof value === "boolean" || typeof value === "number" || typeof value === "string";
}

function toRedisReply(value: unknown): RedisReply {
  if (isRedisData(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isRedisData(item)) {
        return item;
      }
      throw new TypeError(`rate-limiter: unexpected ioredis reply element type "${typeof item}"`);
    });
  }
  throw new TypeError(`rate-limiter: unexpected ioredis reply type "${typeof value}"`);
}

/**
 * Connects the single shared ioredis client and returns a factory handing
 * each limiter its own rate-limit-redis store. express-rate-limit forbids
 * reusing one store instance across limiters (ERR_ERL_STORE_REUSE) because
 * a store's windowMs is configured by its limiter's init() — so every
 * limiter gets a fresh store under its own Redis key prefix, all backed by
 * one client/connection. The ioredis import is lazy so deployments without
 * REDIS_URL (local dev) never load or connect to Redis.
 */
async function buildRedisStoreFactory(redisUrl: string): Promise<(prefix: string) => Store> {
  const { default: Redis } = await import("ioredis");
  const { RedisStore } = await import("rate-limit-redis");
  const redis = new Redis(redisUrl);
  // Without a listener, an ioredis "error" event would crash the process.
  redis.on("error", (err) => logger.error({ err }, "Rate-limit Redis client error"));
  return (prefix: string) =>
    new RedisStore({
      prefix,
      // rate-limit-redis sends raw commands; route them through ioredis's
      // (command, args[]) call form (rate-limit-redis always passes at least
      // the command name as args[0]).
      sendCommand: (...args: string[]) => {
        const [command, ...rest] = args;
        return redis.call(command, rest).then(toRedisReply);
      },
    });
}

// Limits live in process memory unless REDIS_URL is configured. On
// serverless/multi-instance deployments (Vercel) each instance counts
// separately, so effective limits multiply by instance count. When
// REDIS_URL is set, one shared ioredis client backs a per-limiter Redis
// store below; when unset, each limiter keeps its default in-process
// MemoryStore (local dev needs no Redis).
const makeRedisStore: ((prefix: string) => Store) | undefined = env.REDIS_URL
  ? await buildRedisStoreFactory(env.REDIS_URL)
  : undefined;

if (makeRedisStore) {
  logger.info("Rate limiting uses the shared Redis store — counts are global across instances.");
} else if (env.IS_PRODUCTION) {
  logger.warn("No REDIS_URL configured — rate limits are per-instance and can be diluted across instances.");
}

const standardMessage = { success: false, message: "Too many requests, please try again later" };

export const generalLimiter = rateLimit({
  store: makeRedisStore?.("rl:general"),
  windowMs: FIFTEEN_MINUTES_MS,
  max: 100,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardMessage,
});

export const contactLimiter = rateLimit({
  store: makeRedisStore?.("rl:contact"),
  windowMs: env.CONTACT_RATE_LIMIT_WINDOW_MS,
  max: env.CONTACT_RATE_LIMIT_MAX,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages sent, please try again later" },
});

export const adminLimiter = rateLimit({
  store: makeRedisStore?.("rl:admin"),
  windowMs: FIFTEEN_MINUTES_MS,
  max: 200,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many admin requests, please try again later" },
});

export const imageMetadataLimiter = rateLimit({
  store: makeRedisStore?.("rl:image-meta"),
  windowMs: ONE_MINUTE_MS,
  max: 60,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardMessage,
});

/**
 * Tight rate limit for the image upload endpoint.
 * The Clerk-auth path skips this (the 200/adminLimiter covers it), but
 * any caller holding ADMIN_API_KEY is rate-limited to 10 uploads/min to
 * prevent storage exhaustion. Body size is already capped at 10MB by multer.
 */
export const imageUploadLimiter = rateLimit({
  store: makeRedisStore?.("rl:image-upload"),
  windowMs: ONE_MINUTE_MS,
  max: 10,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Upload rate limit exceeded — try again in a minute" },
});

export const apiKeyLimiter = rateLimit({
  store: makeRedisStore?.("rl:apikey"),
  windowMs: FIFTEEN_MINUTES_MS,
  max: 50,
  skip: (req) => skipIfDev() || !req.headers["x-admin-key"],
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "API key rate limit exceeded" },
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    return `apikey:${ipKeyGenerator(ip)}`;
  },
});

export const chatLimiter = rateLimit({
  store: makeRedisStore?.("rl:chat"),
  windowMs: env.AI_CHAT_RATE_LIMIT_WINDOW_MS,
  max: env.AI_CHAT_RATE_LIMIT_MAX,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many chat messages, please try again later" },
});
