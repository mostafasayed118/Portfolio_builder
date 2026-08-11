import type { Request, Response, NextFunction } from "express";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { timingSafeEqual } from "crypto";
import { logger } from "../lib/logger";
import { env } from "../lib/env";
import { syncUserFromClerk, getDefaultAdminUser } from "../lib/user-sync";

const ADMIN_EMAILS = env.VITE_ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
const clerkClient = env.CLERK_SECRET_KEY ? createClerkClient({ secretKey: env.CLERK_SECRET_KEY }) : null;

function isApiKeyValid(key: string | undefined): key is string {
  if (!key || !env.ADMIN_API_KEY || key.length !== env.ADMIN_API_KEY.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(env.ADMIN_API_KEY));
}

export interface AuthenticatedRequest extends Request {
  adminEmail?: string;
  user?: { id: string; email: string; role: string };
}

const emailCache = new Map<string, { email: string; ts: number }>();
const CACHE_TTL = 60_000;
const MAX_CACHE_SIZE = 100;

function cleanCache() {
  if (emailCache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [key, value] of emailCache.entries()) {
      if (now - value.ts > CACHE_TTL) emailCache.delete(key);
    }
    if (emailCache.size >= MAX_CACHE_SIZE) {
      const entries = Array.from(emailCache.entries());
      entries.sort((a, b) => a[1].ts - b[1].ts);
      entries.slice(0, Math.floor(entries.length / 2)).forEach(([key]) => emailCache.delete(key));
    }
  }
}

async function verifyClerkJWT(token: string): Promise<{ email: string; clerkId: string } | null> {
  if (!env.CLERK_SECRET_KEY) {
    logger.info("AUTH: Clerk auth skipped — CLERK_SECRET_KEY not set");
    return null;
  }
  cleanCache();
  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      ...(env.CLERK_ISSUER ? { issuer: env.CLERK_ISSUER } : {}),
    });
    const clerkId = payload.sub;
    if (!clerkId) return null;
    const emailFromToken = ((payload as { email?: string; emailAddress?: string })?.email ??
      (payload as { email?: string; emailAddress?: string })?.emailAddress ?? "") as string;
    if (emailFromToken) return { email: emailFromToken.toLowerCase(), clerkId };
    if (clerkId.startsWith("user_") && clerkClient) {
      const cached = emailCache.get(clerkId);
      if (cached && Date.now() - cached.ts < CACHE_TTL) return { email: cached.email, clerkId };
      const user = await clerkClient.users.getUser(clerkId);
      const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;
      if (email) {
        emailCache.set(clerkId, { email: email.toLowerCase(), ts: Date.now() });
        return { email: email.toLowerCase(), clerkId };
      }
    }
    return null;
  } catch (err) {
    logger.info({ err: err instanceof Error ? err.message : String(err) }, "AUTH: Clerk JWT verification failed");
    return null;
  }
}

export async function adminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const clerkToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const adminKey = req.headers["x-admin-key"] as string | undefined;

  // Debug: log auth attempt
  logger.debug({
    hasClerkToken: !!clerkToken,
    hasAdminKey: !!adminKey,
    hasClerkSecret: !!env.CLERK_SECRET_KEY,
    adminEmailsCount: ADMIN_EMAILS.length,
    path: req.path,
  }, "AUTH: incoming request");

  // Admin API key (simplest path, works without Clerk)
  if (isApiKeyValid(adminKey)) {
    logger.info({
      ip: req.ip,
      path: req.path,
      method: req.method,
      authMethod: "api-key",
    }, "AUTH: Admin access via API key");
    req.adminEmail = "api-key-admin";
    // Set req.user for API key auth so collection routes work
    const apiUser = await getDefaultAdminUser();
    if (apiUser) req.user = apiUser;
    next();
    return;
  }

  // No admin restriction configured — reject in ALL environments
  if (ADMIN_EMAILS.length === 0 && !env.ADMIN_API_KEY) {
    res.status(401).json({
      success: false,
      message: "Admin access not configured. Set VITE_ADMIN_EMAILS or ADMIN_API_KEY.",
    });
    return;
  }

  // Clerk JWT — properly verified against Clerk's JWKS
  if (clerkToken) {
    const verified = await verifyClerkJWT(clerkToken);
    if (verified && ADMIN_EMAILS.includes(verified.email)) {
      req.adminEmail = verified.email;

      // Sync user from Clerk and attach to request
      const user = await syncUserFromClerk(verified.clerkId, verified.email);
      if (user) {
        req.user = user;
      }

      next();
      return;
    }
  }

  // Auth failed — log reason for debugging
  const reason = clerkToken
    ? (ADMIN_EMAILS.length > 0 ? "email not in ADMIN_EMAILS or JWT invalid" : "no ADMIN_EMAILS configured")
    : "no Bearer token or x-admin-key header";
  logger.info({ path: req.path, reason }, "AUTH: rejected");
  res.status(401).json({ success: false, message: "Unauthorized" });
}
