/**
 * Retry helpers for transient Supabase / network failures.
 *
 * Why this exists:
 *   The api-server's auth flow calls `syncUserFromClerk` on every
 *   authenticated request. A single transient failure (Supabase
 *   connection blip, 5xx from PostgREST) would leave the user with
 *   no `users` row, which cascades into empty collection queries and
 *   a broken admin experience. Retrying the lookup 2-3 times with
 *   exponential backoff absorbs the common case without hiding real
 *   bugs (auth/permission errors are NOT retried).
 *
 * The retry only fires for:
 *   - Network errors (fetch failed, connection reset, etc.)
 *   - HTTP 5xx responses
 *   - PostgREST error codes 502/503/504 (bad gateway / unavailable)
 *
 * The retry NEVER fires for:
 *   - 4xx errors (auth failed, permission denied, not found)
 *   - PostgREST error codes 23505 (unique violation), 23503 (FK), etc.
 *   - Schema errors (42703, 42P01)
 *
 * This is a minimal in-house retry, not a full circuit breaker — for
 * a production deployment with high request volume, add a circuit
 * breaker (e.g. opossum) and timeouts around Supabase calls.
 */

import { logger } from "./logger";

/** PostgREST / Supabase error shape — the minimum we need to decide. */
export interface SupabaseError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number; // HTTP status if the response is a real error
  // Anything else we don't care about
  [k: string]: unknown;
}

/** Detect whether a Supabase error is worth retrying. */
export function isTransientError(err: SupabaseError | null | undefined): boolean {
  if (!err) return false;
  // HTTP status (when present) is the strongest signal
  if (typeof err.status === "number") {
    if (err.status >= 500 && err.status < 600) return true;
    if (err.status === 408 || err.status === 429) return true;
    return false;
  }
  // PostgREST error codes worth retrying
  const TRANSIENT_CODES = new Set([
    "502", // bad gateway (PostgREST proxying to Postgres)
    "503", // service unavailable
    "504", // gateway timeout
    "57014", // statement timeout
    "53300", // too many connections
    "08000", // connection exception
    "08003", // connection does not exist
    "08006", // connection failure
    "08001", // sqlclient unable to establish sqlconnection
    "08004", // sqlserver rejected establishment of sqlconnection
    "08007", // transaction resolution unknown
  ]);
  if (err.code && TRANSIENT_CODES.has(err.code)) return true;
  // Network-shaped messages
  if (typeof err.message === "string") {
    const m = err.message.toLowerCase();
    if (m.includes("fetch failed") || m.includes("network") || m.includes("econnreset") ||
        m.includes("etimedout") || m.includes("enotfound") || m.includes("socket hang up")) {
      return true;
    }
  }
  return false;
}

export interface RetryOptions {
  /** Maximum total attempts (including the first call). Default 3. */
  maxAttempts?: number;
  /** Base delay in ms. Default 100. */
  baseDelayMs?: number;
  /** Optional cap on the delay between attempts. Default 2000. */
  maxDelayMs?: number;
  /** Optional operation name for logging. */
  opName?: string;
}

/**
 * Retry an async operation up to `maxAttempts` times if it throws a
 * transient error. Non-transient errors (4xx, schema errors, business
 * rule violations) are re-thrown immediately.
 *
 * Delays are exponential with jitter: 100ms, 200ms, 400ms, ... up to
 * `maxDelayMs`. We use jitter to avoid thundering-herd on shared
 * Supabase connection pools.
 *
 * Accepts any thenable (Supabase query builders are thenable but
 * technically not `Promise<...>`), so the return type is `T` rather
 * than `Promise<Promise<T>>` for query-builder chains.
 */
export async function withRetry<T>(
  fn: () => T | PromiseLike<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  const baseDelay = Math.max(1, opts.baseDelayMs ?? 100);
  const maxDelay = Math.max(baseDelay, opts.maxDelayMs ?? 2000);
  const opName = opts.opName ?? "op";

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const transient = isTransientError(err as SupabaseError);
      if (!transient || attempt === maxAttempts) {
        if (attempt > 1) {
          logger.warn(
            { op: opName, attempt, maxAttempts, transient },
            "Non-transient error or retries exhausted",
          );
        }
        throw err;
      }
      // exp backoff with ±30% jitter
      const base = Math.min(maxDelay, baseDelay * 2 ** (attempt - 1));
      const jitter = base * (0.7 + Math.random() * 0.6);
      logger.warn(
        { op: opName, attempt, maxAttempts, retryInMs: Math.round(jitter), err: (err as Error)?.message },
        "Transient error — retrying",
      );
      await new Promise((r) => setTimeout(r, jitter));
    }
  }
  // unreachable
  throw lastErr;
}
