import { logger } from "./logger";
import { env } from "./env";
import { getSupabaseClient } from "./supabase-client";
import { withRetry } from "./retry";

const ADMIN_EMAILS = env.ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

/**
 * `null` and PostgREST "no rows" errors are expected when the user
 * simply doesn't exist yet — they're not real failures.
 */
function isIgnorable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return true;
  if (err.code === "PGRST116") return true;
  return false;
}

export async function syncUserFromClerk(clerkId: string, email: string, name?: string): Promise<{ id: string; email: string; role: string } | null> {
  const supabase = getSupabaseClient();

  try {
    const { data: existing, error: lookupError } = await withRetry(
      () => supabase.from("users").select("id, email, role").eq("clerk_id", clerkId).single(),
      { opName: "syncUserFromClerk:lookupByClerkId", maxAttempts: 3 },
    );
    if (lookupError && !isIgnorable(lookupError)) {
      logger.error({ err: lookupError, clerkId, email }, "Failed to lookup user by clerk_id");
    } else if (existing) {
      return existing;
    }
  } catch (err) {
    logger.warn({ err, clerkId, email }, "Lookup by clerk_id failed after retries; trying by email");
  }

  try {
    const { data: byEmail, error: emailErr } = await withRetry(
      () => supabase.from("users").select("id, email, role").eq("email", email).single(),
      { opName: "syncUserFromClerk:lookupByEmail", maxAttempts: 3 },
    );
    if (emailErr && !isIgnorable(emailErr)) {
      logger.error({ err: emailErr, clerkId, email }, "Failed to lookup user by email");
    } else if (byEmail) {
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

let _defaultAdminCache: { id: string; email: string; role: string; ts: number } | null = null;
const DEFAULT_ADMIN_CACHE_TTL = 60_000; // 1 minute — roles can change, don't cache forever

export async function getDefaultAdminUser(): Promise<{ id: string; email: string; role: string } | null> {
  if (_defaultAdminCache && Date.now() - _defaultAdminCache.ts < DEFAULT_ADMIN_CACHE_TTL) {
    return _defaultAdminCache;
  }
  try {
    const supabase = getSupabaseClient();
    const defaultEmail = ADMIN_EMAILS[0] ?? "api-admin@localhost";

    const { data: existing } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("email", defaultEmail)
      .single();

    if (existing) {
      _defaultAdminCache = { ...existing, ts: Date.now() };
      return existing;
    }

    // First-boot bootstrap only: mint the default admin as `superadmin` only
    // when no superadmin exists yet. If one already exists, create a regular
    // `user` so a later API-key call can never silently mint extra
    // superadmins (the role can be promoted explicitly via the admin UI).
    const { data: existingSuperadmin } = await supabase
      .from("users")
      .select("id")
      .eq("role", "superadmin")
      .limit(1)
      .maybeSingle();

    const role: "user" | "superadmin" = existingSuperadmin ? "user" : "superadmin";

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        clerk_id: `apikey_${defaultEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        email: defaultEmail,
        name: "API Admin",
        role,
      })
      .select("id, email, role")
      .single();

    if (insertError) {
      logger.error({ err: insertError, email: defaultEmail }, "Failed to create default admin user");
      return null;
    }

    if (newUser) _defaultAdminCache = { ...newUser, ts: Date.now() };
    return newUser;
  } catch (err) {
    logger.warn({ err }, "getDefaultAdminUser failed — Supabase may be unreachable");
    return null;
  }
}