import rateLimit from "express-rate-limit";
import type { Request } from "express";

const isDev = process.env.NODE_ENV !== "production";

const skipIfDev = (_req: Request) => isDev;

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages sent, please try again later" },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: skipIfDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later" },
});
