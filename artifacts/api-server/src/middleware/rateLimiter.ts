import rateLimit, { ipKeyGenerator } from "express-rate-limit";
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

// Limits live in process memory unless REDIS_URL is configured. On
// serverless/multi-instance deployments (Vercel) each instance counts
// separately, so effective limits multiply by instance count. Wire a
// rate-limit-redis store here when REDIS_URL is set.
if (env.IS_PRODUCTION && !env.REDIS_URL) {
  logger.warn("No REDIS_URL configured — rate limits are per-instance and can be diluted across instances.");
}

const standardMessage = { success: false, message: "Too many requests, please try again later" };

export const generalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 100,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardMessage,
});

export const contactLimiter = rateLimit({
  windowMs: env.CONTACT_RATE_LIMIT_WINDOW_MS,
  max: env.CONTACT_RATE_LIMIT_MAX,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages sent, please try again later" },
});

export const adminLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 200,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many admin requests, please try again later" },
});

export const imageMetadataLimiter = rateLimit({
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
  windowMs: ONE_MINUTE_MS,
  max: 10,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Upload rate limit exceeded — try again in a minute" },
});

export const apiKeyLimiter = rateLimit({
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
