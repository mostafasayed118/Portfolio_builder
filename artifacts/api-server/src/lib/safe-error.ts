/**
 * safeErrorMessage — map a Supabase / PostgREST / unknown error to a
 * user-safe string. The original `error.message` may contain internal
 * details (table names, column names, RLS internals, RPC bodies) that
 * are useful in server logs but should NEVER reach a client.
 *
 * Rules:
 *   - Known PostgREST codes → fixed user-friendly copy
 *   - Known HTTP-ish phrases in the message (e.g. "TypeError", network)
 *     → mapped to friendly copy
 *   - Everything else → generic "Internal server error"
 *   - The CALLER is responsible for logging the original `err` server-side
 *     via `logSupabaseError()` or the global `errorHandler` middleware.
 */
export function safeErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Internal server error";
  const e = err as { code?: string; message?: string; name?: string };
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" ? e.message : "";

  // Supabase missing-table / missing-relation — a migration hasn't run.
  if (code === "42P01" || code === "PGRST106") {
    return "Service is initializing — please try again shortly.";
  }
  // Row not found (used for .single() misses — usually 404, not 500).
  if (code === "PGRST116") return "Not found.";
  // Unique violation / conflict.
  if (code === "23505") return "That value already exists.";
  // Foreign key violation.
  if (code === "23503") return "Cannot complete — referenced record does not exist.";
  // Check constraint violation.
  if (code === "23514") return "Value violates a database constraint.";
  // RLS denial — leak nothing about the policy.
  if (code === "42501") return "You do not have permission to perform that action.";
  // Supabase storage "object not found" / "bucket not found".
  if (code === "PGRST102" || code === "PGRST103") {
    return "Requested resource is unavailable.";
  }
  // Network/timeout-style errors (AbortError, fetch failed).
  if (
    e.name === "AbortError" ||
    /aborted|timeout|network|fetch failed|Failed to fetch/i.test(message)
  ) {
    return "Upstream service timed out. Please try again.";
  }
  // Service-role client failed to initialize (env vars missing, etc.).
  if (/Missing SUPABASE_(URL|SERVICE_ROLE_KEY)/i.test(message)) {
    return "Service is misconfigured. Contact the administrator.";
  }
  // Fallback — never echo the raw message.
  return "Internal server error";
}

/** Convenience: 500 response with a safe message, returns Response for chaining. */
import type { Response } from "express";
export function serverErrorSafe(
  res: Response,
  err: unknown,
  _ctx?: { route?: string; method?: string },
): Response {
  return res.status(500).json({ success: false, message: safeErrorMessage(err) });
}
