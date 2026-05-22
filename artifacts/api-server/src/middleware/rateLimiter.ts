import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const isDev = process.env.NODE_ENV === "development";
const RATE_LIMIT_DISABLED = process.env.DISABLE_RATE_LIMIT === "true";

if (RATE_LIMIT_DISABLED) {
  console.warn("⚠️  Rate limiting DISABLED — DISABLE_RATE_LIMIT=true. This is unsafe in production.");
}

const skipIfDev = (_req: Request) => RATE_LIMIT_DISABLED;

export const generalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 100,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

export const contactLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  max: 5,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages sent, please try again later" },
});

export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 10,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later" },
});

export const adminLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 200,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests, please try again later" },
});

export const imageMetadataLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

export const apiKeyLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 50,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "API key rate limit exceeded" },
  keyGenerator: async (req) => {
    const ip = await ipKeyGenerator(req as any);
    return `apikey:${ip}`;
  },
});
