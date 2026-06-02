import type { Request, Response, NextFunction } from "express";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { timingSafeEqual } from "crypto";
import { logger } from "../lib/logger";
import { env } from "../lib/env";
import { getSupabaseClient } from "../lib/supabase-client";
import { withRetry } from "../lib/retry";

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
      if (now - value.ts > CACHE_TTL) {
        emailCache.delete(key);
      }
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
      (payload as { email?: string; emailAddress?: string })?.emailAddress ??
      "") as string;
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

async function syncUserFromClerk(clerkId: string, email: string, name?: string): Promise<{ id: string; email: string; role: string } | null> {
  const supabase = getSupabaseClient();

  // 1. Look up existing user by clerk_id (with retry on transient errors)
  try {
    const { data: existing, error: lookupError } = await withRetry(
      () => supabase.from("users").select("id, email, role").eq("clerk_id", clerkId).single(),
      { opName: "syncUserFromClerk:lookupByClerkId", maxAttempts: 3 },
    );
    if (lookupError && !isIgnorable(lookupError)) {
      logger.error({ err: lookupError, clerkId, email }, "Failed to lookup user by clerk_id");
      // Fall through to email lookup rather than give up
    } else if (existing) {
      return existing;
    }
  } catch (err) {
    // Retries exhausted on transient error — fall through to email lookup
    logger.warn({ err, clerkId, email }, "Lookup by clerk_id failed after retries; trying by email");
  }

  // 2. If not found by clerk_id, try by email (covers manually-created users)
  try {
    const { data: byEmail, error: emailErr } = await withRetry(
      () => supabase.from("users").select("id, email, role").eq("email", email).single(),
      { opName: "syncUserFromClerk:lookupByEmail", maxAttempts: 3 },
    );
    if (emailErr && !isIgnorable(emailErr)) {
      logger.error({ err: emailErr, clerkId, email }, "Failed to lookup user by email");
    } else if (byEmail) {
      // Update clerk_id for existing email-based user
      await withRetry(
        () => supabase.from("users").update({ clerk_id: clerkId }).eq("id", byEmail.id),
        { opName: "syncUserFromClerk:linkClerkId", maxAttempts: 3 },
      ).catch((err) => {
        logger.warn({ err, userId: byEmail.id }, "Failed to link clerk_id after retries; continuing");
      });
      return byEmail;
    }
  } catch (err) {
    logger.warn({ err, clerkId, email }, "Lookup by email failed after retries; will try insert");
  }

  // 3. Create new user
  try {
    const { data: newUser, error: insertError } = await withRetry(
      () => supabase
        .from("users")
        .insert({ clerk_id: clerkId, email, name: name ?? email.split("@")[0], role: "user" })
        .select("id, email, role")
        .single(),
      { opName: "syncUserFromClerk:insert", maxAttempts: 3 },
    );

    if (insertError) {
      // PGRST116 = "no rows returned" from .single() — treat as failure to create
      logger.error({ err: insertError, clerkId, email }, "Failed to create user");
      return null;
    }

    if (!newUser) {
      logger.warn({ clerkId, email }, "User insert returned no row");
      return null;
    }

    logger.info({ userId: newUser.id, email, clerkId }, "Auto-provisioned new user");
    return newUser;
  } catch (err) {
    logger.error({ err, clerkId, email }, "Insert user failed after retries");
    return null;
  }
}

/**
 * `null` and PostgREST "no rows" errors are expected when the user
 * simply doesn't exist yet — they're not real failures. Everything
 * else (4xx, schema, etc.) is a real failure that should be logged.
 */
function isIgnorable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return true;
  // PostgREST "Results contain 0 rows" from .single()
  if (err.code === "PGRST116") return true;
  return false;
}

// Look up or create a default admin user for API key / dev-mode auth
// Returns null if Supabase is not configured or connection fails (non-blocking)
async function getDefaultAdminUser(): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const supabase = getSupabaseClient();
    const defaultEmail = ADMIN_EMAILS[0] ?? "api-admin@localhost";

    // Try to find existing user by email
    const { data: existing } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", defaultEmail)
      .single();

    if (existing) return existing;

    // Create default admin user with a stable clerk_id for API key auth
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        clerk_id: `apikey_${defaultEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: defaultEmail,
        name: "API Admin",
        role: "superadmin", // API key users are superadmin by default
      })
      .select("id, email, role")
      .single();

    if (insertError) {
      logger.error({ err: insertError, email: defaultEmail }, "Failed to create default admin user");
      return null;
    }

    return newUser;
  } catch {
    // Supabase not configured or connection failed — return null gracefully
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

    // JWT verification failed — fall back to API key if present
    if (isApiKeyValid(adminKey)) {
      logger.warn({
        path: req.path,
        jwtError: verified ? "email not in ADMIN_EMAILS" : "JWT invalid or expired",
        authMethod: "api-key-fallback",
      }, "AUTH: JWT failed, falling back to API key");
      req.adminEmail = "api-key-admin";
      const apiUser = await getDefaultAdminUser();
      if (apiUser) req.user = apiUser;
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
