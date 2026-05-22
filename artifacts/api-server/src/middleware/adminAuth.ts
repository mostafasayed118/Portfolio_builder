import type { Request, Response, NextFunction } from "express";
import { verifyToken, createClerkClient } from "@clerk/backend";
import { timingSafeEqual } from "crypto";
import { logger } from "../lib/logger";
import { getSupabaseClient } from "../lib/supabase-client";

const ADMIN_EMAILS = (process.env.VITE_ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_ISSUER = process.env.CLERK_ISSUER;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const isProduction = process.env.NODE_ENV === "production";

const clerkClient = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;

function isApiKeyValid(key: string | undefined): key is string {
  if (!key || !ADMIN_API_KEY || key.length !== ADMIN_API_KEY.length) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(ADMIN_API_KEY));
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
  if (!CLERK_SECRET_KEY) {
    logger.info("AUTH: Clerk auth skipped — CLERK_SECRET_KEY not set");
    return null;
  }
  cleanCache();
  try {
    const payload = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
      ...(CLERK_ISSUER ? { issuer: CLERK_ISSUER } : {}),
    });

    const clerkId = payload.sub;
    if (!clerkId) return null;

    const emailFromToken = ((payload as Record<string, unknown>)?.email ??
      (payload as Record<string, unknown>)?.emailAddress ??
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
  try {
    const supabase = getSupabaseClient();

    // Look up existing user
    const { data: existing, error: lookupError } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("clerk_id", clerkId)
      .single();

    if (existing) return existing;

    // If not found by clerk_id, try by email (in case user was created manually)
    const { data: byEmail } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", email)
      .single();

    if (byEmail) {
      // Update clerk_id for existing email-based user
      await supabase.from("users").update({ clerk_id: clerkId }).eq("id", byEmail.id);
      return byEmail;
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ clerk_id: clerkId, email, name: name ?? email.split("@")[0], role: "user" })
      .select("id, email, role")
      .single();

    if (insertError) {
      logger.error({ err: insertError, clerkId, email }, "Failed to create user");
      return null;
    }

    logger.info({ userId: newUser.id, email, clerkId }, "Auto-provisioned new user");
    return newUser;
  } catch (err) {
    logger.error({ err, clerkId, email }, "Failed to sync user from Clerk");
    return null;
  }
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
    hasClerkSecret: !!CLERK_SECRET_KEY,
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
  if (ADMIN_EMAILS.length === 0 && !ADMIN_API_KEY) {
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
