import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { logger } from "../lib/logger";
import { env } from "../lib/env";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const RATE_LIMIT_DISABLED = env.DISABLE_RATE_LIMIT;

if (RATE_LIMIT_DISABLED) {
  logger.warn("Rate limiting DISABLED — DISABLE_RATE_LIMIT=true. This is unsafe in production.");
}

const skipIfDev = (_req: Request) => RATE_LIMIT_DISABLED;

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
  windowMs: ONE_HOUR_MS,
  max: 5,
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
  windowMs: 60 * 1000,
  max: 60,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardMessage,
});

export const apiKeyLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 50,
  skip: (req) => RATE_LIMIT_DISABLED || !req.headers["x-admin-key"],
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "API key rate limit exceeded" },
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    return `apikey:${ipKeyGenerator(ip)}`;
  },
});
